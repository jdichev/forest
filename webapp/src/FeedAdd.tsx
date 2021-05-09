import { useState, useEffect, useCallback } from "react";
import { useHistory, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import DataService from "./service/DataService";

const ds = DataService.getInstance();

export default function FeedAdd() {
  const history = useHistory();

  const { register, handleSubmit, getValues } = useForm();
  const useFormMethods2 = useForm();

  const [feedCategories, setFeedCategories] = useState<FeedCategory[]>([]);

  const [formFeedData, setFormFeedData] = useState<Feed[]>([]);

  const [checkedFeeds, setCheckedFeeds] = useState<string[]>([]);

  const [initialFormError, setInitialFormError] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await ds.getFeedCategories();
      res.sort((a, b) => a.title.localeCompare(b.title));
      setFeedCategories(res);
    })();
  }, []);

  const onSubmitFirstStep = useCallback(async (data) => {
    const inputFieldInitial = document.getElementById("feedUrlInitial");
    inputFieldInitial?.setAttribute("disabled", "disabled");

    const submitInitial = document.getElementById("feedSubmitInitial");
    if (submitInitial) {
      submitInitial.innerText = "Loading...";
    }
    submitInitial?.setAttribute("disabled", "disabled");

    const feeds = await ds.checkFeed(data.feedUrlInitial);
    console.log(feeds);

    if (submitInitial) {
      submitInitial.innerText = "Go";
    }
    submitInitial?.removeAttribute("disabled");
    inputFieldInitial?.removeAttribute("disabled");

    if (feeds.length === 0) {
      setInitialFormError(true);
      setFormFeedData([]);
      setCheckedFeeds([]);
    } else {
      setInitialFormError(false);
      setFormFeedData(feeds);
      const feedUrlsToCheck = feeds.map((feed) => {
        return feed.feedUrl;
      });
      console.log(feedUrlsToCheck);
      const checkedFeedsRes = await ds.checkFeedUrls(feedUrlsToCheck);
      setCheckedFeeds(checkedFeedsRes);
    }
  }, []);

  const onSubmitSecondStep = useCallback(
    async (index) => {
      const data = getValues();

      await ds.addFeed({
        feedUrl: data[`feedUrl-${index}`],
        url: data[`url-${index}`],
        title: data[`title-${index}`],
        feedCategoryId: parseInt(data[`feedCategory-${index}`], 10),
      });

      setCheckedFeeds((prev) => {
        const next: string[] = [...prev];
        next.push(data[`feedUrl-${index}`]);

        return next;
      });

      if (formFeedData.length === checkedFeeds.length + 1) {
        history.push("/feeds/list");
      }
    },
    [getValues, history, checkedFeeds, formFeedData]
  );

  const onSubmitFileImport = useCallback((data) => {
    console.log(data);

    const fileName = data.importFile[0].path;

    ds.importOpmlFile(fileName);
  }, []);

  return (
    <>
      <nav id="sidebar-menu" />

      <main id="main-content">
        <div id="feed-panel" className="p-4">
          <div id="panel-single-column">
            <form onSubmit={handleSubmit(onSubmitFirstStep)}>
              <h3>Add new feed</h3>

              <div className="mb-3 input-group-sm">
                <label htmlFor="feedUrlInitial" className="form-label">
                  Enter site or feed URL
                </label>

                <input
                  // placeholder="E.g. http://example.com or http://example.com/feed.rss"
                  className="form-control input"
                  id="feedUrlInitial"
                  name="feedUrlInitial"
                  ref={register({ required: true })}
                />

                {initialFormError && (
                  <p className="alert alert-warning">Feed not found</p>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-sm btn-primary me-3"
                id="feedSubmitInitial"
              >
                Go
              </button>

              <Link
                to="/feeds/list"
                className="btn btn-sm btn-outline-secondary"
              >
                Back
              </Link>
            </form>

            <div className="container mt-5">
              {formFeedData.map((feedData, i) => {
                return (
                  <form
                    key={feedData.feedUrl}
                    className="mt-3"
                    // onSubmit={handleSubmit(onSubmitSecondStep)}
                  >
                    <div className="row">
                      <div className="col-6">{feedData.title}</div>
                      <div className="col">
                        <input
                          type="hidden"
                          name={`title-${i}`}
                          ref={register}
                          value={feedData.title}
                        />
                        <input
                          type="hidden"
                          name={`url-${i}`}
                          ref={register}
                          value={feedData.url}
                        />
                        <input
                          type="hidden"
                          name={`feedUrl-${i}`}
                          ref={register}
                          value={feedData.feedUrl}
                        />
                        <select
                          name={`feedCategory-${i}`}
                          className="form-select form-select-sm"
                          ref={register}
                        >
                          {feedCategories.map((feedCategory) => {
                            return (
                              <option
                                key={feedCategory.id}
                                value={feedCategory.id}
                              >
                                {feedCategory.title}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div className="col">
                        {checkedFeeds.includes(feedData.feedUrl) ? (
                          <div>Added</div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              onSubmitSecondStep(i);
                            }}
                            type="submit"
                            className="btn btn-primary btn-sm"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  </form>
                );
              })}
            </div>

            <div className="pt-5">
              <form onSubmit={useFormMethods2.handleSubmit(onSubmitFileImport)}>
                <h3>Import OPML file</h3>

                <div className="mb-3 input-group-sm">
                  <label htmlFor="importFile" className="form-label">
                    Choose OPML file
                  </label>

                  <input
                    className="form-control"
                    type="file"
                    name="importFile"
                    id="importFile"
                    ref={useFormMethods2.register({ required: true })}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-sm btn-primary me-3"
                  id="opmlImportSubmit"
                >
                  Import
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
