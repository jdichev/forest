import { useState, useEffect, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import DataService from "./service/DataService";
import Article from "./components/Article";
import ItemsTable from "./components/ItemsTable";
import CategoriesMain from "./components/CategoriesMain";

const ds = DataService.getInstance();

export default function Home({ topMenu }: HomeProps) {
  const [items, setItems] = useState<Item[]>([]);

  const [feedCategories, setFeedCategories] = useState<FeedCategory[]>([]);

  const [feedReadStats, setFeedReadStats] = useState<FeedReadStat[]>([]);

  const [feedCategoryReadStats, setFeedCategoryReadStats] = useState<
    FeedCategoryReadStat[]
  >([]);

  const [size, setSize] = useState<number>(50);

  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);

  const [selectedFeedCategory, setSelectedFeedCategory] =
    useState<FeedCategory>();

  const [selectedFeed, setSelectedFeed] = useState<Feed>();

  const [article, setArticle] = useState<Item>();

  const [selectedItem, setSelectedItem] = useState<Item>();

  const [categoryFeeds, setCategoryFeeds] = useState<{
    [key: string]: FeedCategory[];
  }>({});

  const [activeNav, setActiveNav] = useState<string>("categories");

  const listRef = useRef<HTMLDivElement>(null);

  const articleRef = useRef<HTMLDivElement>(null);

  const showFeedCategories = useCallback(async () => {
    const res = await ds.getFeedCategories();

    res.sort((a, b) => a.title.localeCompare(b.title));

    setFeedCategories(res);
  }, []);

  const updateFeedCategoryReadStats = useCallback(async () => {
    const res = await ds.getFeedCategoryReadStats();

    setFeedCategoryReadStats(res);
  }, []);

  const updateFeedReadStats = useCallback(async () => {
    const res = await ds.getFeedReadStats();

    setFeedReadStats(res);
  }, []);

  const showItems = useCallback(async () => {
    let res;
    if (selectedFeed) {
      res = await ds.getItems({ size, unreadOnly, selectedFeed });
    } else {
      res = await ds.getItems({ size, unreadOnly, selectedFeedCategory });
    }

    setItems(res);
    updateFeedCategoryReadStats();
  }, [
    size,
    selectedFeedCategory,
    selectedFeed,
    unreadOnly,
    updateFeedCategoryReadStats,
  ]);

  useEffect(() => {
    showItems();
  }, [size, showItems]);

  useEffect(() => {
    showFeedCategories();
    updateFeedCategoryReadStats();
  }, [showFeedCategories, updateFeedCategoryReadStats]);

  useEffect(() => {
    const updatesInterval = setInterval(() => {
      // showFeedCategories();
      updateFeedCategoryReadStats();
    }, 60000);

    return () => {
      clearInterval(updatesInterval);
    };
  }, [showFeedCategories, updateFeedCategoryReadStats]);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.code === "Enter") {
        visitSite();
      }

      if (e.code === "KeyW") {
        if (activeNav === "categories") {
          selectPrevFeedOrCategory();
        } else if (activeNav === "items") {
          selectPreviousItem();
        }
      }

      if (e.code === "KeyS") {
        if (activeNav === "categories") {
          selectNextFeedOrCategory();
        } else if (activeNav === "items") {
          selectNextItem();
        }
      }

      if (e.code === "KeyA") {
        if (activeNav === "items") {
          setActiveNav("categories");

          if (selectedFeed) {
            document.getElementById(`feed-${selectedFeed.id}`)?.focus();
          } else {
            document
              .getElementById(
                `category-${
                  selectedFeedCategory ? selectedFeedCategory.id : "all"
                }`
              )
              ?.focus();
          }
        } else {
          if (selectedFeedCategory) {
            if (selectedFeedCategory.expanded) {
              setSelectedFeed(undefined);
            }

            setFeedCategories((prev) => {
              return prev.map((feedCategoryInner) => {
                if (feedCategoryInner.id === selectedFeedCategory.id) {
                  feedCategoryInner.expanded = !feedCategoryInner.expanded;
                } else {
                  feedCategoryInner.expanded = false;
                }

                return feedCategoryInner;
              });
            });

            await loadCategoryFeeds(selectedFeedCategory);
            await updateFeedReadStats();
          }
        }
      }

      if (e.code === "KeyD") {
        if (items.length === 0) {
          return;
        }

        if (activeNav === "categories") {
          setActiveNav("items");
          if (!article) {
            selectNextItem();
          } else {
            const item = document.getElementById(`item-${article.id}`);
            if (item) {
              document.getElementById(`item-${article.id}`)?.focus();
            } else {
              selectItem(undefined, items[0]);
            }
          }
        }
      }

      if (e.code === "KeyQ") {
        markItemsRead();
        setArticle(undefined);
        setActiveNav("categories");
      }

      if (e.code === "KeyE") {
        setActiveNav("categories");
        showUnreadOnly();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  /**
   * Load more items
   */
  const loadMore = useCallback(async () => {
    setSize(size + Math.floor(size / 2));
  }, [size]);

  /**
   * Select item
   */
  const selectItem = useCallback(
    async (e: Event | undefined, item: Item) => {
      e?.preventDefault();

      setSelectedItem(item);

      setActiveNav("items");

      document.getElementById(`item-${item.id}`)?.focus();

      articleRef.current?.scrollTo(0, 0);

      const article = await ds.getItem(item.id);

      setArticle(article);

      if (item.read === 0) {
        setItems((prevItems) => {
          const nextItems = prevItems.map((prevItem) => {
            if (prevItem === item) {
              prevItem.read = 1;
            }

            return prevItem;
          });

          return nextItems;
        });

        await ds.markItemRead(item).catch((reason) => {
          console.error(reason);
        });
        await updateFeedCategoryReadStats();

        updateFeedReadStats();
      }
    },
    [updateFeedCategoryReadStats, updateFeedReadStats]
  );

  /**
   * Mark items as read. If filtered, only the ones matching
   * the filter wll be marked as read
   */
  const markItemsRead = useCallback(() => {
    setUnreadOnly(false);
    setItems((prevItems) => {
      const nextItems = prevItems.map((prevItem) => {
        prevItem.read = 1;

        return prevItem;
      });

      return nextItems;
    });

    ds.markItemsRead({
      feedCategory: selectedFeedCategory,
      feed: selectedFeed,
    })
      .then(async () => {
        await updateFeedCategoryReadStats();
        await updateFeedReadStats();
      })
      .catch((reason) => {
        console.error(reason);
      });
  }, [
    selectedFeedCategory,
    selectedFeed,
    updateFeedCategoryReadStats,
    updateFeedReadStats,
  ]);

  const loadCategoryFeeds = useCallback(
    async (feedCategory) => {
      const feedIdStr = `${feedCategory.id}`;

      if (!categoryFeeds[feedIdStr]) {
        const feeds = await ds.getFeeds({
          selectedFeedCategory: feedCategory,
        });

        setCategoryFeeds((prev) => {
          const next = { ...prev };

          next[feedIdStr] = feeds;

          return next;
        });
      }
    },
    [categoryFeeds]
  );

  /**
   * Select feed category, filtering items
   */
  const selectFeedCategory = useCallback(
    async (feedCategory, e) => {
      setSelectedFeed(undefined);
      setSize(50);
      setSelectedFeedCategory(feedCategory);
      setArticle(undefined);
      setSelectedItem(undefined);
      listRef.current?.scrollTo(0, 0);
      setActiveNav("categories");

      setUnreadOnly(false);
      document
        .getElementById(`category-${feedCategory ? feedCategory.id : "all"}`)
        ?.focus();

      if (e && e.target.classList.contains("categoryChevron")) {
        setFeedCategories((prev) => {
          return prev.map((feedCategoryInner) => {
            if (feedCategoryInner.id === feedCategory.id) {
              feedCategoryInner.expanded = !feedCategoryInner.expanded;
            } else {
              feedCategoryInner.expanded = false;
            }

            return feedCategoryInner;
          });
        });

        await loadCategoryFeeds(feedCategory);
        await updateFeedReadStats();
      }
    },
    [loadCategoryFeeds, setFeedCategories, updateFeedReadStats]
  );

  /**
   * Select a feed
   */
  const selectFeed = useCallback(
    (feed) => {
      setSize(50);
      setSelectedFeed(feed);
      setUnreadOnly(false);
      listRef.current?.scrollTo(0, 0);
      document.getElementById(`feed-${feed.id}`)?.focus();
    },
    [setSize]
  );

  const selectNextFeedOrCategory = useCallback(() => {
    if (selectedFeedCategory?.expanded) {
      const feedIndex = categoryFeeds[`${selectedFeedCategory.id}`].findIndex(
        (categoryFeed) => {
          return categoryFeed.id === selectedFeed?.id;
        }
      );

      const newFeedIndex = feedIndex + 1;

      if (newFeedIndex < categoryFeeds[`${selectedFeedCategory.id}`].length) {
        selectFeed(categoryFeeds[`${selectedFeedCategory.id}`][newFeedIndex]);

        return;
      }
    }

    const index = feedCategories.findIndex((feedCategory) => {
      return feedCategory.id === selectedFeedCategory?.id;
    });

    const newIndex = index + 1;

    if (newIndex < feedCategories.length) {
      selectFeedCategory(feedCategories[newIndex], undefined);
    }
  }, [
    feedCategories,
    selectedFeedCategory,
    selectFeedCategory,
    categoryFeeds,
    selectedFeed,
    selectFeed,
  ]);

  const selectPrevFeedOrCategory = useCallback(() => {
    if (selectedFeedCategory?.expanded) {
      const feedIndex = categoryFeeds[`${selectedFeedCategory.id}`].findIndex(
        (categoryFeed) => {
          return categoryFeed.id === selectedFeed?.id;
        }
      );

      const newFeedIndex = feedIndex - 1;

      if (newFeedIndex === -1) {
        selectFeed(undefined);

        return;
      } else if (newFeedIndex >= 0) {
        selectFeed(categoryFeeds[`${selectedFeedCategory.id}`][newFeedIndex]);

        return;
      }
    }

    const index = feedCategories.findIndex((feedCategory) => {
      return feedCategory.id === selectedFeedCategory?.id;
    });

    const newIndex = index - 1;

    if (newIndex === -1) {
      selectFeedCategory(undefined, undefined);
    } else if (newIndex >= 0) {
      const selectedFeedCategoryInner = feedCategories[newIndex];
      selectFeedCategory(selectedFeedCategoryInner, undefined);

      if (selectedFeedCategoryInner?.expanded) {
        const selectedCategoryFeeds =
          categoryFeeds[`${selectedFeedCategoryInner.id}`];

        selectFeed(selectedCategoryFeeds[selectedCategoryFeeds.length - 1]);
      }
    }
  }, [
    feedCategories,
    selectedFeedCategory,
    selectFeedCategory,
    categoryFeeds,
    selectedFeed,
    selectFeed,
  ]);

  const selectNextItem = useCallback(() => {
    const index = items.findIndex((item) => {
      return item.id === selectedItem?.id;
    });

    const newIndex = index + 1;

    if (newIndex < items.length) {
      selectItem(undefined, items[newIndex]);
    }
  }, [items, selectItem, selectedItem]);

  const selectPreviousItem = useCallback(() => {
    const index = items.findIndex((item) => {
      return item.id === article?.id;
    });

    const newIndex = index - 1;

    if (newIndex >= 0) {
      selectItem(undefined, items[newIndex]);
    }
  }, [article, items, selectItem]);

  const visitSite = useCallback(() => {
    article && window.open(article.url, "", "noopener,noreferrer");
  }, [article]);

  /**
   * Show unread only
   */
  const showUnreadOnly = useCallback(async () => {
    setArticle(undefined);
    setSelectedItem(undefined);
    setUnreadOnly(!unreadOnly);
  }, [unreadOnly]);

  /**
   * Get the unread counts for category with unread items
   * @param feedCategoryId
   */
  const getUnreadCountForFeedCategory = useCallback(
    (feedCategoryId: number | undefined) => {
      const feedCategoryReadStat = feedCategoryReadStats.find(
        (feedCategoryReadStatRecord) => {
          return feedCategoryId === feedCategoryReadStatRecord.id;
        }
      );

      return feedCategoryReadStat?.unreadCount
        ? `${feedCategoryReadStat.unreadCount}`
        : "";
    },
    [feedCategoryReadStats]
  );

  /**
   * Get the unread counts for feed with unread items
   * @param feedId
   */
  const getUnreadCountForFeed = useCallback(
    (feedId: number | undefined) => {
      const feedReadStat = feedReadStats.find((feedReadStatRecord) => {
        return feedId === feedReadStatRecord.id;
      });

      return feedReadStat ? `${feedReadStat.unreadCount}` : "";
    },
    [feedReadStats]
  );

  const getTotalUnreadCount = useCallback(() => {
    const totalFeedStat = feedCategoryReadStats.reduce(
      (acc, currentFeedCategoryReadStat) => {
        return acc + currentFeedCategoryReadStat.unreadCount;
      },
      0
    );

    return totalFeedStat > 0 ? `${totalFeedStat}` : "";
  }, [feedCategoryReadStats]);

  const handleScroll = useCallback(
    (e) => {
      if (
        Math.ceil(
          e.nativeEvent.target.scrollTop + e.nativeEvent.target.offsetHeight
        ) >= e.nativeEvent.target.scrollHeight
      ) {
        loadMore();
      }

      if (e.nativeEvent.target.scrollTop === 0) {
        showItems();
      }
    },
    [showItems]
  );

  return (
    <>
      <CategoriesMain
        activeNav={activeNav}
        feedCategories={feedCategories}
        categoryFeeds={categoryFeeds}
        selectedFeedCategory={selectedFeedCategory}
        selectFeedCategory={selectFeedCategory}
        selectedFeed={selectedFeed}
        selectFeed={selectFeed}
        getTotalUnreadCount={getTotalUnreadCount}
        getUnreadCountForFeedCategory={getUnreadCountForFeedCategory}
        getUnreadCountForFeed={getUnreadCountForFeed}
      />

      <main id="main-content">
        <div
          id="list-panel"
          ref={listRef}
          onScroll={handleScroll}
          data-activenav={activeNav === "items" ? "true" : "false"}
        >
          {topMenu.current &&
            ReactDOM.createPortal(
              <>
                <button
                  type="button"
                  className="btn btn-sm"
                  id="items-check-all-read-x"
                  title="Mark all read"
                  onClick={() => markItemsRead()}
                >
                  <i className="bi bi-check2-circle" />
                </button>

                <button
                  type="button"
                  className="btn btn-sm"
                  id="unread-only"
                  onClick={() => showUnreadOnly()}
                >
                  {unreadOnly ? (
                    <i className="bi bi-circle-fill" />
                  ) : (
                    <i className="bi bi-circle" />
                  )}
                </button>
              </>,
              topMenu.current
            )}

          <ItemsTable
            items={items}
            selectedItem={selectedItem}
            selectItem={selectItem}
          />
        </div>

        <div id="content-panel" ref={articleRef}>
          <Article article={article} />
        </div>
      </main>
    </>
  );
}
