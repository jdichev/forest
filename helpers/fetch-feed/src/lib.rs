use tokio::runtime::Builder;

use serde_json::json;
use serde_json::Value;

use syndication::Feed;

use ammonia::clean;

use libc::c_char;

use std::ffi::CStr;
use std::ffi::CString;

#[no_mangle]
pub extern "C" fn fetch_feed_release(s: *mut c_char) {
    unsafe {
        if s.is_null() {
            return;
        }
        CString::from_raw(s)
    };
}

#[no_mangle]
pub extern "C" fn fetch_feed_extern(s: *const c_char) -> *mut c_char {
    let c_str = unsafe {
        assert!(!s.is_null());

        CStr::from_ptr(s)
    };

    let r_str = c_str.to_str().unwrap();

    let runtime = Builder::new_multi_thread()
        .worker_threads(4)
        .thread_name("fetch-feed")
        .thread_stack_size(3 * 1024 * 1024)
        .enable_io()
        .enable_time()
        .build()
        .unwrap();

    let res = runtime.block_on(fetch_feed(r_str.to_owned()));

    let c_str_song = CString::new(res).unwrap();

    return c_str_song.into_raw();
}

pub async fn fetch_feed(feed_url: String) -> String {
    let mut result_json_str: String = "".to_string();

    let response = reqwest::get(feed_url).await;

    match response {
        Err(error) => {
            println!("Failed to get response\n{:?}", error);
            result_json_str.push_str("{\"error\": \"Failed to get response\"}");
        }

        Ok(response_result) => {
            let content = response_result.text().await;

            match content {
                Err(error) => {
                    println!("Failed to get response text payload\n{:?}", error);
                    result_json_str.push_str("{\"error\": \"Failed to get response text\"}");
                }

                Ok(content_result) => {
                    match content_result.parse::<Feed>() {
                        Err(error) => {
                            println!("{{\"error\": \"Error: failed to parse feed {:?}\"}}", error);
                            // println!("Content\n{:?}", content_result);
                
                            result_json_str.push_str("{{\"error\": \"Error: failed to parse feed\"}}")
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
                                    if entry.content().is_some() {
                                        description = Some(entry.content().unwrap().value());
                                    } else {
                                        description = Some(entry.summary());
                                    }
                
                                    let parsed = dateparser::parse(&pub_date.unwrap_or_default());

                                    let link;
                                    if entry.links().len() > 0 {
                                        link = entry.links()[0].href();
                                    } else {
                                        link = "";
                                    }
                
                                    let feed_item = json!({
                                        "title": entry.title(),
                                        "description": clean(description.unwrap_or_default().unwrap_or_default()),
                                        "published": parsed.unwrap_or_default().timestamp(),
                                        "publishedRaw": pub_date,
                                        "link": link
                                    });
                
                                    feed_items.push(feed_item);
                                }
                
                                let feed_links: Vec<&str> = atom_feed.links().iter()
                                    .map(|link| link.href())
                                    .collect();
                
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
                                    let pub_date = item.pub_date().unwrap_or_default();
                                    let parsed = dateparser::parse(pub_date);
                                    
                                    let description;
                                    if item.description().is_some() {
                                        description = item.description().unwrap_or_default();
                                    } else if item.content().is_some() {
                                        description = item.content().unwrap_or_default();
                                    } else {
                                        description = "NO_DESCR";
                                    }
                
                                    let feed_item = json!({
                                        "title": item.title().unwrap_or_default(),
                                        "description": clean(description),
                                        "published": parsed.unwrap_or_default().timestamp(),
                                        "published_raw": item.pub_date().unwrap_or_default(),
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



    return result_json_str;
}
