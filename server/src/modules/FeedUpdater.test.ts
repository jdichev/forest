import FeedUpdater from "./FeedUpdater";

describe("FeedUpdater", () => {
  it("should create an instance", () => {
    const feedUpdater = new FeedUpdater();
    expect(feedUpdater).toBeInstanceOf(FeedUpdater);
  });
});
