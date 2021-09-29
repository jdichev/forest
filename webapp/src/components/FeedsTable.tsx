import { Link } from "react-router-dom";

export default function FeedsTable({ feeds, removeFeed }: FeedsTableProps) {
  return (
    <table className="table table-striped table-borderless table-sm feeds-table">
      <thead>
        <tr>
          <th>
            <small>Feed {feeds.length}</small>
          </th>
          <th>
            <small>Link</small>
          </th>
          <th>
            <small>Errors</small>
          </th>
          <th>
            <small>Actions</small>
          </th>
        </tr>
      </thead>
      <tbody>
        {feeds.map((feed) => {
          return feed.hidden ? (
            null
          ) : (
            <tr key={feed.id}>
              <td data-testid="feed-edit-link">
                <Link
                  to={{
                    pathname: `/feeds/edit/${feed.id}`,
                  }}
                  className="text-decoration-none"
                >
                  {feed.title}
                </Link>
              </td>
              <td>
                <small> {feed.feedUrl}</small>
              </td>
              <td>
                <small>{feed.error}</small>
              </td>
              <td>
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
                  <small>
                    <i className="bi bi-trash"></i>
                  </small>
                </a>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
