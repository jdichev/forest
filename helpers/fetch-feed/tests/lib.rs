#[cfg(test)]

mod tests {
    use fetch_feed::fetch_feed;
    use httpmock::prelude::*;
    use serde_json::Value;

    #[tokio::test]
    async fn fetch_feed_test() {
        let test_rss = r###"
        <?xml version="1.0" encoding="UTF-8"?>
        <rss xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/" xmlns:webfeeds="http://webfeeds.org/rss/1.0" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">
            <channel>
                <title>ProgrammableWeb.com - Feed</title>
                <link>https://www.programmableweb.com/</link>
                <description>The leading source of news and information around APIs, Mashups, Apps and the Web as a Platform, chronicling the evolution of the global API economy and providing the web’s most relied-on API Directory.</description>
                <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="https://bold.7112182096.workers.dev/" type="application/rss+xml" rel="self"/>
                <atom:link rel="hub" href="http://pubsubhubbub.appspot.com"/>
                <language>en</language>
                <copyright>ProgrammableWeb.com</copyright>
                <pubDate>Thu, 22 Sep 2022 01:58:26 +0200</pubDate>
                <lastBuildDate>Thu, 22 Sep 2022 01:58:26 +0200</lastBuildDate>
                <ttl>1</ttl>
                <webfeeds:analytics id="UA-238360219-1" engine="GoogleAnalytics"/>
                <webfeeds:accentColor>e30613</webfeeds:accentColor>
                <webfeeds:cover image="https://bold.7112182096.workers.dev/webfeeds_cover.png"/>
                <webfeeds:icon>https://bold.7112182096.workers.dev/webfeeds_icon.png</webfeeds:icon>
                <webfeeds:logo>https://bold.7112182096.workers.dev/webfeeds_logo.png</webfeeds:logo>
                <webfeeds:related layout="card" target="browser"/>
                <image>
                    <url>https://www.programmableweb.com/</url>
                    <title>ProgrammableWeb.com - Feed</title>
                    <link>https://bold.7112182096.workers.dev/channel_image.png</link>
                </image>
                <item>
                    <title>Revolut confirms cyberattack exposed personal data of tens of thousands of users</title>
                    <link>https://bold.7112182096.workers.dev/redirect?url=https://techcrunch.com/2022/09/20/revolut-cyberattack-thousands-exposed/</link>
                    <description>Fintech startup Revolut has confirmed it was hit by a highly targeted cyberattack that allowed hackers to access the personal details of tens of thousands of customers.</description>
                    <content:encoded><![CDATA[
                        <div>
                            <div>
                                <p><strong><a
                                            href="https://bold.7112182096.workers.dev/redirect?url=https://techcrunch.com/2021/07/15/revolut-confirms-a-fresh-800m-in-funding-at-a-33b-valuation-to-supercharge-its-financial-services-superapp/">Fintech
                                            startup Revolut</a> </strong>has confirmed it was hit by a highly targeted cyberattack that allowed
                                    hackers to
                                    access the personal details of tens of thousands of customers.</p>
                                <p>Revolut spokesperson Michael Bodansky told TechCrunch that an “unauthorized third party obtained access to
                                    the details of a small percentage (0.16%) of our customers for a short period of time.” Revolut discovered
                                    the malicious access late on September 10 and isolated the attack by the following morning.</p>
                                <p>“We immediately identified and isolated the attack to effectively limit its impact and have contacted those
                                    customers affected,” Bodansky said. “Customers who have not received an email have not been impacted.”</p>
                                <p>Revolut, which has a banking license in Lithuania, wouldn’t say exactly how many customers were affected. Its
                                    website says the company has approximately 20 million customers; 0.16% would translate to about 32,000
                                    customers. However, according to Revolut’s <a
                                        href="https://bold.7112182096.workers.dev/redirect?url=https://vdai.lrv.lt/lt/naujienos/valstybine-duomenu-apsaugos-inspekcija-pradejo-tyrima-del-revolut-asmens-duomenu-saugumo-pazeidimo"
                                        target="_blank" rel="noopener">breach disclosure</a> to the authorities in Lithuania, first spotted by
                                    <a href="https://bold.7112182096.workers.dev/redirect?url=https://www.bleepingcomputer.com/news/security/revolut-hack-exposes-data-of-50-000-users-fuels-new-phishing-wave/"
                                        target="_blank" rel="noopener">Bleeping Computer</a>, the company says 50,150 customers were impacted by
                                    the breach, including 20,687 customers in the European Economic Area and 379 Lithuanian citizens.
                                </p>
        
                                <figure>
                                    <img src="https://bold.7112182096.workers.dev/img_revolut_2.gif">
                                    <figcaption>Image Credits: Revolut</figcaption>
                                </figure>
        
                                <p>Revolut also declined to say what types of data were accessed but told TechCrunch that no funds were accessed
                                    or stolen in the incident. In <a
                                        href="https://bold.7112182096.workers.dev/redirect?url=https://www.reddit.com/r/Revolut/comments/xew1w3/revolut_was_hacked/"
                                        target="_blank" rel="noopener">a message sent to affected customers</a> posted to Reddit, the company
                                    said that “no card details, PINs or passwords were accessed.” However, the breach disclosure states that
                                    hackers likely accessed partial card payment data, along with customers’ names, addresses, email addresses
                                    and phone numbers.</p>
                                <p>The disclosure states that the threat actor used social engineering methods to gain access to the Revolut
                                    database, which typically involves persuading an employee to hand over sensitive information such as their
                                    password. This has become a popular tactic in recent attacks against a number of well-known companies,
                                    including <a
                                        href="https://bold.7112182096.workers.dev/redirect?url=https://techcrunch.com/2022/08/25/twilio-hackers-group-ib/">Twilio</a>,&nbsp;<a
                                        href="https://bold.7112182096.workers.dev/redirect?url=https://techcrunch.com/2022/04/04/mailchimp-internal-tool-breach/">Mailchimp</a>
                                    and&nbsp;<a
                                        href="https://bold.7112182096.workers.dev/redirect?url=https://techcrunch.com/2022/03/23/okta-breach-sykes-sitel/">Okta</a>.
                                </p>
                                <p>But Revolut warned that the breach appears to have <a
                                        href="https://bold.7112182096.workers.dev/redirect?url=https://twitter.com/reportsmishing/status/1571605419650424833"
                                        target="_blank" rel="noopener">triggered</a> a phishing campaign, and urged customers to be careful when
                                    receiving any
                                    communication regarding the breach. The startup advised customers that it will not call or send SMS messages
                                    asking for login data or access codes.</p>
                                <p>As a precaution, Revolut has also formed a dedicated team tasked with monitoring customer accounts to make
                                    sure that both money and data are safe.</p>
                                <p>“We take incidents such as these incredibly seriously, and we would like to sincerely apologize to any
                                    customers who have been affected by this incident as the safety of our customers and their data is our top
                                    priority at Revolut,” Bodansky added.</p>
                                <blockquote>
                                    <p>
                                        Last year Revolut <a
                                            href="https://bold.7112182096.workers.dev/redirect?url=https://techcrunch.com/2021/07/15/revolut-confirms-a-fresh-800m-in-funding-at-a-33b-valuation-to-supercharge-its-financial-services-superapp/">raised
                                            $800 million in fresh capital</a>, valuing the startup at more than $33 billion.</p>
                                </blockquote>
                        
                            </div>
                        
                        
                            <iframe src="https://bold.7112182096.workers.dev/blank" frameBorder="0" scrolling="no" width="0" height="0"></iframe>
                        </div>
                        ]]></content:encoded>
                    <guid isPermaLink="false">https://bold.7112182096.workers.dev/2</guid>
                    <pubDate>Thu, 22 Sep 2022 01:58:26 +0200</pubDate>
                    <category><![CDATA[Venture]]></category>
                    <category><![CDATA[data leak]]></category>
                    <category><![CDATA[Revolut]]></category>
                    <category><![CDATA[venture capital]]></category>
                    <author>Niel Patnal</author>
                </item>
            </channel>
        </rss>
        "###;

        // Start a lightweight mock server.
        let server = MockServer::start();

        println!("address {}", server.address());
        println!("port {}", server.port());

        let expected_url = format!("http://127.0.0.1:{}/test.rss", server.port());

        // Create a mock on the server.
        // let rss_feed_mock = 
        server.mock(|when, then| {
            when.method(GET).path("/test.rss");
            then.status(200)
                .header("content-type", "text/rss")
                .body(test_rss);
        });

        let res = fetch_feed(expected_url.to_owned()).await.expect("fetch_feed should succeed");
        // println!("{:?}", res);

        let json_res: Value = serde_json::from_str(&res).unwrap_or_default();

        // rss_feed_mock.assert();

        assert_eq!(
            "Revolut confirms cyberattack exposed personal data of tens of thousands of users",
            json_res["items"][0]["title"]
        );
        
    }
}
