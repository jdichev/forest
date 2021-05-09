import { useEffect, useState, useRef } from "react";
import { HashRouter as Router, Switch, Route, Link } from "react-router-dom";

import Feeds from "./FeedsMain";
import FeedsList from "./FeedsList";
import FeedAdd from "./FeedAdd";
import FeedEdit from "./FeedEdit";

export default function App() {
  const navMenu = useRef<HTMLDivElement>(null);
  const [twoColLayout, setTwoColLayout] = useState(false);

  useEffect(() => {
    const hashChangeHandler = () => {
      setTwoColLayout(window.location.href.indexOf("feeds/") > -1);
    };

    window.addEventListener("hashchange", hashChangeHandler, false);
    return () => {
      window.removeEventListener("hashchange", hashChangeHandler);
    };
  });

  return (
    <div id="wrapper" className={twoColLayout ? "two-columns" : ""}>
      <Router>
        <div id="top-nav-brand">
          <Link to="/" className="text-decoration-none" />
        </div>

        <div className="main-content" id="top-nav-content">
          <div id="top-nav-menu" ref={navMenu} />

          <div id="top-nav-options">
            <Link
              to="/feeds/add"
              className="text-decoration-none"
              id="add-feeds"
            >
              <i className="bi bi-plus"></i>
            </Link>

            <Link to="/feeds/list" className="text-decoration-none">
              <small>Feeds</small>
            </Link>
          </div>
        </div>

        <Switch>
          <Route path="/" exact render={() => <Feeds topMenu={navMenu} />} />

          <Route
            path="/feeds/list"
            exact
            render={() => <FeedsList topMenu={navMenu} />}
          />

          <Route path="/feeds/add" exact component={FeedAdd} />

          <Route path="/feeds/edit/:feedId" component={FeedEdit} />
        </Switch>
      </Router>
    </div>
  );
}
