import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FieldValues, useForm } from "react-hook-form";
import DataService from "./service/DataService";

const ds = DataService.getInstance();

export default function FeedAdd() {
  const navigate = useNavigate();

  const { register, handleSubmit, getValues } = useForm();
  const useFormMethods2 = useForm();

  const [feedCategories, setFeedCategories] = useState<FeedCategory[]>([]);

  const [formFeedData, setFormFeedData] = useState<Feed[]>([]);

  const [checkedFeeds, setCheckedFeeds] = useState<string[]>([]);

  const [initialFormError, setInitialFormError] = useState(false);

  const [exportStatus, setExportStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  useEffect(() => {
    const loadFeedCategories = async () => {
      const res = await ds.getFeedCategories();
      res.sort((a, b) => a.title.localeCompare(b.title));
      setFeedCategories(res);
    };

    loadFeedCategories();
  }, []);

  const onSubmitFirstStep = useCallback(async (data: FieldValues) => {
    const inputFieldInitial = document.getElementById("feedUrlInitial");
    inputFieldInitial?.setAttribute("disabled", "disabled");

    const submitInitial = document.getElementById("feedSubmitInitial");
    if (submitInitial) {
      submitInitial.innerText = "Loading...";
    }
    submitInitial?.setAttribute("disabled", "disabled");

    const feeds = await ds.checkFeed(data.feedUrlInitial);
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
      const checkedFeedsRes = await ds.checkFeedUrls(feedUrlsToCheck);
      setCheckedFeeds(checkedFeedsRes);
    }
  }, []);

  const onSubmitSecondStep = useCallback(
    async (index: number) => {
      const data = getValues();

      await ds.addFeed({
        feedUrl: data[`feedUrl-${index}`],
        url: data[`url-${index}`],
        title: data[`title-${index}`],
        feedCategoryId: parseInt(data[`feedCategory-${index}`]),
      });

      setCheckedFeeds((prev) => {
        const next: string[] = [...prev];
        next.push(data[`feedUrl-${index}`]);

        return next;
      });

      if (formFeedData.length === checkedFeeds.length + 1) {
        navigate("/feeds/list");
      }
    },
    [getValues, navigate, checkedFeeds, formFeedData]
  );

  const onSubmitFileImport = useCallback((data: FieldValues) => {
    console.log("Importing file:", data);
    const file = data.importFile[0];

    // Check if we're in Electron environment (has .path property)
    if (file.path) {
      // Electron: use file path directly
      ds.importOpmlFile({ filePath: file.path });
    } else {
      // Browser: read file content
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        ds.importOpmlFile({ fileContent: content, fileName: file.name });
      };
      reader.readAsText(file);
    }
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
                  required
                  {...register("feedUrlInitial")}
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
                className="btn btn-sm btn-outline-secondary ms-3"
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
                          {...register(`title-${i}`)}
                          value={feedData.title}
                        />
                        <input
                          type="hidden"
                          {...register(`url-${i}`)}
                          value={feedData.url}
                        />
                        <input
                          type="hidden"
                          {...register(`feedUrl-${i}`)}
                          value={feedData.feedUrl}
                        />
                        <select
                          className="form-select form-select-sm"
                          {...register(`feedCategory-${i}`)}
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
                    id="importFile"
                    required
                    {...useFormMethods2.register("importFile")}
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

              <div className="pt-4">
                <h3>Export OPML file</h3>
                <p>Download all your feeds in OPML format</p>

                {exportStatus.type && <div>{exportStatus.message}</div>}

                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={async () => {
                    try {
                      setExportStatus({ type: null, message: "" });
                      await ds.exportOpmlFile();
                      setExportStatus({
                        type: "success",
                        message: "OPML file exported successfully!",
                      });
                      setTimeout(() => {
                        setExportStatus({ type: null, message: "" });
                      }, 3000);
                    } catch (error) {
                      console.error("Export failed:", error);
                      setExportStatus({
                        type: "error",
                        message:
                          "Failed to export OPML file. Please try again.",
                      });
                      setTimeout(() => {
                        setExportStatus({ type: null, message: "" });
                      }, 5000);
                    }
                  }}
                >
                  Export OPML
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
