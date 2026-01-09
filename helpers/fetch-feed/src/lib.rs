#[cfg(feature = "napi-export")]
use napi::bindgen_prelude::*;
#[cfg(feature = "napi-export")]
use napi_derive::napi;

use serde_json::json;
use serde_json::Value;

use syndication::Feed;

use std::time::Duration;

mod helpers;
use helpers::{parse_date, process_markup};

#[cfg(feature = "napi-export")]
#[napi]
pub async fn fetch_feed_async(feed_url: String) -> Result<String> {
  fetch_feed(feed_url).await
    .map_err(|e| Error::from_reason(e))
}

#[cfg(feature = "napi-export")]
#[napi]
pub fn fetch_feed_sync(feed_url: String) -> Result<String> {
  let runtime = tokio::runtime::Builder::new_multi_thread()
    .worker_threads(4)
    .thread_name("fetch-feed")
    .thread_stack_size(3 * 1024 * 1024)
    .enable_io()
    .enable_time()
    .build()
    .map_err(|e| Error::from_reason(format!("Failed to create runtime: {}", e)))?;

  runtime.block_on(fetch_feed(feed_url))
    .map_err(|e| Error::from_reason(e))
}

pub async fn fetch_feed(feed_url: String) -> std::result::Result<String, String> {
  let mut result_json_str = String::new();
  let client = reqwest::Client::builder()
    .timeout(Duration::from_secs(2))
    .build()
    .unwrap_or_default();

  let response = client.get(feed_url).send().await;

  match response {
    Err(error) => {
      println!("Failed to get response\n{:?}", error);
      return Err("Failed to get response".to_string());
    }

    Ok(response_result) => {
      let content = response_result.text().await;

      match content {
        Err(error) => {
          println!("Failed to get response text payload\n{:?}", error);
          return Err("Failed to get response text".to_string());
        }

        Ok(content_result) => {
          match content_result.parse::<Feed>() {
            Err(error) => {
              println!("{{\"error\": \"Error: failed to parse feed {:?}\"}}", error);
              return Err("Error: failed to parse feed".to_string());
            }

            Ok(feed) => match feed {
              Feed::Atom(atom_feed) => {
                let mut feed_items: Vec<Value> = Vec::new();

                for entry in atom_feed.entries().iter() {
                  let pub_date;
                  if entry.published().is_some() {
                    pub_date = entry.published();
                  } else if !entry.updated().is_empty() {
                    pub_date = Some(entry.updated());
                  } else {
                    pub_date = Some("NO_DATE");
                  }

                  let description;
                  if entry.summary().is_some() {
                    description = Some(entry.summary().unwrap_or_default());
                  } else {
                    description = Some("");
                  }

                  let content;
                  if entry.content().is_some() {
                    content = Some(entry.content().unwrap().value().unwrap_or_default());
                  } else {
                    content = Some("");
                  }

                  let link;
                  if !entry.links().is_empty() {
                    link = entry.links()[0].href();
                  } else {
                    link = "";
                  }

                  let feed_item = json!({
                      "title": entry.title(),
                      "description": process_markup(description.unwrap_or_default()),
                      "content": process_markup(content.unwrap_or_default()),
                      "published": parse_date(&pub_date.unwrap_or_default()),
                      "publishedRaw": pub_date,
                      "link": link
                  });

                  feed_items.push(feed_item);
                }

                let feed_links: Vec<&str> =
                  atom_feed.links().iter().map(|link| link.href()).collect();

                let feed = json!({
                    "type": "atom",
                    "title": atom_feed.title(),
                    "icon": atom_feed.icon(),
                    "logo": atom_feed.logo(),
                    "links": feed_links,
                    "items": &feed_items
                });

                let res_str = serde_json::to_string_pretty(&feed).unwrap_or_default();

                result_json_str.push_str(&res_str);
              }

              Feed::RSS(rss_feed) => {
                let mut feed_items: Vec<Value> = Vec::new();

                for item in rss_feed.items().iter() {
                  let description;
                  if item.description().is_some() {
                    description = item.description()
                  } else {
                    description = Some("");
                  }

                  let content;
                  if item.content().is_some() {
                    content = item.content();
                  } else {
                    content = Some("");
                  }

                  let feed_item = json!({
                      "title": item.title().unwrap_or_default(),
                      "description": process_markup(description.unwrap_or_default()),
                      "content": process_markup(content.unwrap_or_default()),
                      "published": parse_date(item.pub_date().unwrap_or_default()),
                      "publishedRaw": item.pub_date().unwrap_or_default(),
                      "link": item.link().unwrap_or_default()
                  });

                  feed_items.push(feed_item);
                }

                let mut feed_links: Vec<&str> = Vec::new();
                feed_links.push(&rss_feed.link());

                let feed = json!({
                    "type": "rss",
                    "title": rss_feed.title(),
                    "links": feed_links,
                    "items": &feed_items
                });

                let res_str = serde_json::to_string_pretty(&feed).unwrap_or_default();

                result_json_str.push_str(&res_str);
              }
            },
          };
        }
      }
    }
  };

  Ok(result_json_str)
}
