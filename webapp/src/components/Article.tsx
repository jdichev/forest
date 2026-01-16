import { useEffect, useState, useRef } from "react";
/* eslint-disable react/no-danger */
import FormattedDate from "./FormattedDate";

// @ts-ignore
export default function Article({
  article,
  selectedFeedCategory,
  selectedFeed,
}: ArticleProps) {
  const [videoId, setVideoId] = useState<String>();
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (article && article.url) {
      try {
        const parsedUrl = new URL(article.url);

        if (parsedUrl.hostname.includes("youtube.com")) {
          const foundVideoId = parsedUrl.searchParams.get("v");

          if (foundVideoId) {
            setVideoId(foundVideoId);
          } else {
            setVideoId(undefined);
          }
        } else {
          setVideoId(undefined);
        }
      } catch (error) {
        console.error("Error parsing URL:", error);
        setVideoId(undefined);
      }
    }
  }, [article]);

  // Load YouTube IFrame API
  useEffect(() => {
    if (videoId) {
      // Load YouTube IFrame API script
      if (!(window as any).YT) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        (window as any).onYouTubeIframeAPIReady = () => {
          initPlayer();
        };
      } else {
        initPlayer();
      }
    }

    return () => {
      playerRef.current = null;
    };
  }, [videoId]);

  const initPlayer = () => {
    if (videoId) {
      playerRef.current = new (window as any).YT.Player("player", {
        videoId: videoId,
      });
    }
  };

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle if video is present and we're not typing in an input/textarea
      if (
        videoId &&
        playerRef.current &&
        event.target instanceof HTMLElement &&
        event.target.tagName !== "INPUT" &&
        event.target.tagName !== "TEXTAREA"
      ) {
        // Space to play/pause
        if (event.code === "Space") {
          event.preventDefault();
          const playerState = playerRef.current.getPlayerState();
          // 1 = playing, 2 = paused
          if (playerState === 1) {
            playerRef.current.pauseVideo();
          } else {
            playerRef.current.playVideo();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [videoId]);

  if (article) {
    return (
      <article>
        <h1 id="title" dangerouslySetInnerHTML={{ __html: article.title }} />

        <p>
          {article.feedTitle ? article.feedTitle : "NO_TITLE"},{" "}
          <FormattedDate pubDate={article.published} />
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
          {videoId ? (
            <>
              <iframe
                title={article.title}
                data-testid="yt-embed-frame"
                id="player"
                width="640"
                height="390"
                src={`http://www.youtube.com/embed/${videoId}?enablejsapi=1`}
              />
              <br />
            </>
          ) : (
            <></>
          )}

          <div
            dangerouslySetInnerHTML={{
              //@ts-ignore
              __html: article.content,
            }}
          />
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

  if (selectedFeed) {
    return (
      <article data-testid="article-placeholder">
        <h2>{selectedFeed.title}</h2>
      </article>
    );
  }

  if (selectedFeedCategory) {
    return (
      <article data-testid="article-placeholder">
        <h2>{selectedFeedCategory.title}</h2>
      </article>
    );
  }

  return (
    <article data-testid="article-placeholder">
      <h2>Seeing all categories</h2>
      <h3>Happy reading!</h3>
    </article>
  );
}
