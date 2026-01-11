import { Link } from "react-router-dom";
import ms from "ms";

export default function FeedsTable({ feeds, removeFeed }: FeedsTableProps) {
  return (
    <table className="table table-striped table-borderless table-sm feeds-table">
      <thead>
        <tr>
          <th>
            <small>Feed {feeds.length}</small>
          </th>
          <th>
            <small>Items</small>
          </th>
          <th>
            <small>Errors</small>
          </th>
          <th>
            <small>Freq</small>
          </th>
          <th>
            <small>Actions</small>
          </th>
        </tr>
      </thead>
      <tbody>
        {feeds.map((feed) => {
          return feed.hidden ? null : (
            <tr key={feed.id}>
              <td data-testid="feed-edit-link">
                <small>
                  {feed.id}
                  &nbsp;
                  <Link
                    to={{
                      pathname: `/feeds/edit/${feed.id}`,
                    }}
                    className="text-decoration-none"
                  >
                    {feed.title ? feed.title : "NO_TITLE"}
                  </Link>
                </small>
              </td>
              <td>
                <small>{feed.itemsCount}</small>
              </td>
              <td>
                <small>{feed.error}</small>
              </td>
              <td>
                <small className="text-nowrap">
                  {feed.updateFrequency && ms(feed.updateFrequency)}
                </small>
              </td>
              <td>
                <small>
                  <a
                    data-testid="feed-delete-link"
                    href="/"
                    className="text-decoration-none"
                    onClick={(e) => {
                      e.preventDefault();
                      // @ts-ignore
                      removeFeed(feed.id);
                    }}
                  >
                    <i className="bi bi-trash"></i>
                  </a>
                </small>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
