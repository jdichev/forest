/* eslint-disable react/no-danger */
import FormattedDate from "./FormattedDate";

// @ts-ignore
export default function Article({ article }: ArticleProps) {
  if (article) {
    return (
      <article>
        <h2 id="title" dangerouslySetInnerHTML={{ __html: article.title }} />

        <p>
          {article.feedTitle}, <FormattedDate pubDate={article.published} />
          &nbsp;|&nbsp;♥&nbsp;
          <a
            data-testid="upper-outbound-link"
            href={article.url}
            target="_blank"
            rel="noreferrer noopener"
            title={`Click to Visit ${article.title}`}
            className="text-decoration-none"
          >
            Visit Site
          </a>
          {article.comments ? (
            <>
              &nbsp;|&nbsp;
              <a
                href={article.comments}
                target="_blank"
                rel="noreferrer noopener"
                title="Comments"
                className="text-decoration-none"
              >
                Comments
              </a>
            </>
          ) : (
            ""
          )}
        </p>

        <div id="content">
          {article.jsonContent ? (
            <>
              <iframe
                data-testid="yt-embed-frame"
                id="player"
                width="640"
                height="390"
                src={`http://www.youtube.com/embed/${article.jsonContent["yt-id"]}?enablejsapi=1`}
                frameBorder="0"
              />
              <br />
            </>
          ) : (
            <></>
          )}
          <div dangerouslySetInnerHTML={{ __html: article.content }} />
        </div>

        <ul className="mt-4 fs-6" id="content-options">
          <li>
            <a
              data-testid="lower-outbound-link"
              href={article.url}
              target="_blank"
              rel="noreferrer noopener"
              title={`Click to Visit ${article.title}`}
              className="text-decoration-none"
            >
              Visit {article.feedTitle}
            </a>
          </li>
          {article.comments ? (
            <li>
              <a
                data-testid="comments-link"
                href={article.comments}
                target="_blank"
                rel="noreferrer noopener"
                title="Comments"
                className="text-decoration-none"
              >
                Comments
              </a>
            </li>
          ) : (
            ""
          )}
        </ul>
      </article>
    );
  }

  return (
    <article data-testid="article-placeholder">
      <h2>Happy reading!</h2>
    </article>
  );
}
