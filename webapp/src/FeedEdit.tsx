import { useState, useEffect, useCallback } from "react";
import { useHistory, useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import DataService from "./service/DataService";

const ds = DataService.getInstance();

export default function FeedEdit() {
  const { feedId } = useParams<{ feedId: string }>();

  const feedIdNum = parseInt(feedId);

  const history = useHistory();

  const { register, handleSubmit, errors } = useForm();

  const [feedCategories, setFeedCategories] = useState<FeedCategory[]>([]);

  const [formFeedData, setFormFeedData] = useState<Feed>();

  useEffect(() => {
    const loadFeedCategories = async () => {
      const res = await ds.getFeedCategories();
      res.sort((a, b) => a.title.localeCompare(b.title));
      setFeedCategories(res);
    };

    loadFeedCategories();
  }, []);

  useEffect(() => {
    const loadFormFeedData = async () => {
      const feed = await ds.getFeedById(feedIdNum);

      setFormFeedData(feed);
    };

    loadFormFeedData();
  }, [feedId, feedIdNum]);

  const onSubmit = useCallback(
    async (data) => {
      data.id = feedId;
      data.feedCategoryId = parseInt(data.feedCategoryId);
      data.id = parseInt(data.id);

      await ds.updateFeed(data);

      history.push("/feeds/list");
    },
    [history, feedId]
  );

  return (
    <>
      <nav id="sidebar-menu" />

      <main id="main-content">
        <div id="feed-panel" className="p-4">
          <div id="panel-single-column">
            <form className="p-4" onSubmit={handleSubmit(onSubmit)}>
              <h3>
                Edit feed{" "}
                {formFeedData?.title ? formFeedData.title : "NO_TITLE"}
              </h3>
              <div className="mb-3  input-group-sm">
                <label htmlFor="feedUrl" className="form-label">
                  Feed URL
                </label>
                <input
                  type="url"
                  className="form-control"
                  id="feedUrl"
                  name="feedUrl"
                  ref={register({ required: true })}
                  defaultValue={formFeedData?.feedUrl}
                />
                {errors.feedUrl && <p>Feed URL is needed</p>}
              </div>
              <div className="mb-3  input-group-sm">
                <label htmlFor="feedTitle" className="form-label">
                  Feed Title
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="feedTitle"
                  name="title"
                  maxLength={256}
                  ref={register}
                  defaultValue={formFeedData?.title}
                />
              </div>
              <div className="mb-3  input-group-sm">
                <label htmlFor="feedCategory" className="form-label">
                  Feed Category
                </label>
                <select
                  className="form-select"
                  aria-label="Default select example"
                  id="feedCategoryId"
                  name="feedCategoryId"
                  ref={register}
                  value={formFeedData?.feedCategoryId}
                  onChange={(e) => {
                    if (formFeedData) {
                      const newFormFeedData = { ...formFeedData };
                      newFormFeedData.feedCategoryId = parseInt(e.target.value);
                      setFormFeedData(newFormFeedData);
                    }
                  }}
                >
                  {feedCategories.map((feedCategory) => {
                    return (
                      <option key={feedCategory.id} value={feedCategory.id}>
                        {feedCategory.title}
                      </option>
                    );
                  })}
                </select>
              </div>
              <button type="submit" className="btn btn-primary btn-sm">
                Save
              </button>

              <Link
                to="/feeds/list"
                className="btn btn-outline-secondary btn-sm ms-3"
              >
                Back
              </Link>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
