import { useEffect, useState, useRef } from "react";
import { HashRouter as Router, Switch, Route, NavLink } from "react-router-dom";

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
          <NavLink to="/" className="text-decoration-none" />
        </div>

        <div className="main-content" id="top-nav-content">
          <div id="top-nav-menu" ref={navMenu} />

          <div id="top-nav-options"></div>
        </div>

        <div id="side-menu">
          <NavLink
            exact
            to="/"
            className="text-decoration-none"
            activeClassName="active-nav"
          >
            <i className="bi bi-book-fill"></i>
          </NavLink>

          <NavLink
            exact
            to="/feeds/list"
            className="text-decoration-none"
            activeClassName="active-nav"
          >
            <i className="bi bi-rss-fill"></i>
          </NavLink>

          <NavLink
            exact
            to="/feeds/add"
            className="text-decoration-none"
            activeClassName="active-nav"
          >
            <i className="bi bi-plus-square-fill"></i>
          </NavLink>
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
