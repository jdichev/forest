use std::env;

use fetch_feed::fetch_feed;

#[tokio::main]

async fn main() {
    let feed_url = env::args()
        .nth(1)
        .expect("{\"error\": \"No feed URL given\"}");

    let res = fetch_feed(feed_url.to_string()).await;
    println!("{}", res);
}

