import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import DataService from "./service/DataService";
import FeedsTable from "./components/FeedsTable";

const ds = DataService.getInstance();

export default function Feeds({ topMenu }: FeedsProps) {
  const [feeds, setFeeds] = useState<Feed[]>([]);

  const { register, handleSubmit } = useForm();

  const [feedCategories, setFeedCategories] = useState<FeedCategory[]>([]);

  const [showNewCategoryFeedForm, setShowNewCategoryFeedForm] = useState(false);

  const [selectedFeedCategory, setSelectedFeedCategory] =
    useState<FeedCategory>();

  const loadFeedCategories = useCallback(async () => {
    const res = await ds.getFeedCategories();

    res.sort((a, b) => a.title.localeCompare(b.title));

    setFeedCategories(res);
  }, []);

  useEffect(() => {
    loadFeedCategories();
  }, [loadFeedCategories]);

  const showFeeds = useCallback(async () => {
    const res = await ds.getFeeds({ selectedFeedCategory });

    setFeeds(res);
  }, [selectedFeedCategory]);

  useEffect(() => {
    showFeeds();
  }, [showFeeds]);

  const removeFeed = useCallback(
    async (feedId) => {
      await ds.removeFeed(feedId);

      showFeeds();
    },
    [showFeeds]
  );

  const onAddFeedCategory = useCallback(
    async (data) => {
      const feedCategoryInput: FeedCategory = {
        title: data.feedCategoryName,
        text: data.feedCategoryName,
      };

      await ds.addFeedCategory(feedCategoryInput);

      await loadFeedCategories();

      setShowNewCategoryFeedForm(false);
    },
    [loadFeedCategories, setShowNewCategoryFeedForm]
  );

  const selectFeedCategory = useCallback(
    async (feedCategory, e) => {
      if (e.target.classList.contains("deleteIcon")) {
        const feedCategoryId = parseInt(
          e.target.getAttribute("data-category-id"),
          10
        );

        const confirmResult = confirm(
          "About to delete a category. Please confirm."
        );

        if (!confirmResult) {
          return;
        }

        await ds.removeFeedCategory(feedCategoryId);

        await loadFeedCategories();

        setShowNewCategoryFeedForm(false);
      } else {
        setSelectedFeedCategory(feedCategory);
      }
    },
    [loadFeedCategories]
  );

  const showCategoryFeedForm = useCallback(() => {
    setShowNewCategoryFeedForm(true);
  }, [setShowNewCategoryFeedForm]);

  const hideCategoryFeedForm = useCallback(() => {
    setShowNewCategoryFeedForm(false);
  }, [setShowNewCategoryFeedForm]);

  const inputRef = register({ required: true });
  const inputSearchRef = register();

  const onFeedSearch = useCallback((data) => {
    console.log(data);
    setFeeds((prev) => {
      return prev.map((feed) => {
        if (
          data.feedSearchTerm !== "" &&
          feed.title
            .toLowerCase()
            .indexOf(data.feedSearchTerm.toLowerCase()) === -1 &&
          feed.url &&
          feed.url.toLowerCase().indexOf(data.feedSearchTerm.toLowerCase()) ===
            -1
        ) {
          feed.hidden = true;
        } else {
          feed.hidden = false;
        }
        return feed;
      });
    });
  }, []);

  const [renameCategoryId, setRenameCategoryId] = useState();

  const beginRenameFeedCategory = useCallback((category) => {
    if (category.id !== 0) {
      setRenameCategoryId(category.id);
    }
  }, []);

  const stopRenameFeedCategory = useCallback(() => {
    setRenameCategoryId(undefined);
  }, []);

  const onRenameFeedCategory = useCallback(
    async (data) => {
      const feedCategoryInput: FeedCategory = {
        id: selectedFeedCategory?.id,
        title: data.feedCategoryName,
        text: data.feedCategoryName,
      };
      console.log(feedCategoryInput);

      const result = await ds.updateFeedCategory(feedCategoryInput);

      if (result) {
        setRenameCategoryId(undefined);

        await loadFeedCategories();
      }
    },
    [selectedFeedCategory?.id, loadFeedCategories]
  );

  useEffect(() => {
    if (showNewCategoryFeedForm || renameCategoryId !== undefined) {
      const inputEl = document.getElementById("feedCategoryName");
      inputEl && inputEl.focus();
    }
  }, [showNewCategoryFeedForm, renameCategoryId]);

  return (
    <>
      <nav id="sidebar-menu">
        <ul className="list-unstyled fw-normal small">
          <li className={!selectedFeedCategory ? "feedcategory-selected" : ""}>
            <button
              type="button"
              className="btn btn-sm btn-link text-decoration-none text-truncate"
              onClick={(e) => selectFeedCategory(null, e)}
              tabIndex={0}
            >
              <small>All</small>
            </button>
          </li>
          {feedCategories.map((feedCategory) => {
            return (
              <li
                key={feedCategory.id}
                className={
                  feedCategory.id === selectedFeedCategory?.id
                    ? "feedcategory-selected"
                    : ""
                }
              >
                {renameCategoryId === feedCategory.id ? (
                  <form onSubmit={handleSubmit(onRenameFeedCategory)}>
                    <div className="input-group-sm">
                      <input
                        type="text"
                        className="form-control input"
                        name="feedCategoryName"
                        id="feedCategoryName"
                        onBlur={stopRenameFeedCategory}
                        onKeyUp={(e) => {
                          e.code === "Escape" && stopRenameFeedCategory();
                        }}
                        defaultValue={feedCategory.title}
                        ref={inputRef}
                      />
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-decoration-none text-truncate"
                    onClick={(e) => selectFeedCategory(feedCategory, e)}
                    onDoubleClick={() => beginRenameFeedCategory(feedCategory)}
                    tabIndex={0}
                  >
                    <span>{feedCategory.title}</span>
                    {feedCategory.id !== 0 ? (
                      <span className="menu-marker">
                        <i
                          className="bi bi-trash deleteIcon"
                          data-category-id={feedCategory.id}
                        />
                      </span>
                    ) : (
                      ""
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {showNewCategoryFeedForm && (
          <form onSubmit={handleSubmit(onAddFeedCategory)}>
            <div className="input-group-sm">
              <input
                type="text"
                className="form-control input"
                name="feedCategoryName"
                id="feedCategoryName"
                onBlur={hideCategoryFeedForm}
                onKeyUp={(e) => {
                  e.code === "Escape" && hideCategoryFeedForm();
                }}
                ref={inputRef}
              />
            </div>
          </form>
        )}

        {!showNewCategoryFeedForm && (
          <button
            className="btn btn-sm"
            onClick={showCategoryFeedForm}
            style={{
              display: showNewCategoryFeedForm ? "none" : "",
            }}
          >
            <i className="bi bi-plus"></i>
          </button>
        )}
      </nav>

      <main id="main-content">
        <div id="table-panel">
          <form onSubmit={handleSubmit(onFeedSearch)}>
            <div className="input-group-sm">
              <input
                type="text"
                className="form-control input"
                name="feedSearchTerm"
                id="feedSearchTerm"
                placeholder="Search by feed name"
                ref={inputSearchRef}
              />
            </div>
          </form>

          <FeedsTable feeds={feeds} removeFeed={removeFeed} />
        </div>
      </main>
    </>
  );
}
