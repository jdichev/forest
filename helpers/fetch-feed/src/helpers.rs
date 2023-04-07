use regex::Regex;

use ammonia::clean;

fn has_noscript_tag(markup: &str) -> bool {
  let re = Regex::new(r#"(?sm).*noscript.*"#).unwrap();

  re.is_match(markup)
}

fn clean_before_after_noscript_tag(s: &str) -> String {
  let re_begin = regex::Regex::new(r#"(?sm)^.*<noscript>"#).unwrap();
  let re_end = regex::Regex::new(r#"(?sm)</noscript>.*$"#).unwrap();

  let res_begin = re_begin.replace(s, "").to_string();

  re_end.replace(res_begin.as_str(), "").to_string()
}

fn clean_markup(src: &str) -> String {
  clean(src).to_string()
}

pub fn process_markup(src: &str) -> std::string::String {
  if has_noscript_tag(src) {
    let content = clean_before_after_noscript_tag(src);

    return clean_markup(content.as_str());
  }

  clean_markup(src)
}

pub fn parse_date(date_str: &str) -> i64 {
  dateparser::parse(date_str).unwrap_or_default().timestamp()
}
