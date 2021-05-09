// @ts-nocheck
import parser, { tNode } from "txml";

const opmlParser = {
  load(opmlString: string) {
    const xlmContent: tNode[] = parser.parse(opmlString);

    const startNode = xlmContent[1].children[1].children;

    const categories = startNode.map((node) => {
      return {
        title: node.attributes.title,
        text: node.attributes.text,
      };
    });

    const feeds: Feed[] = [];

    startNode.forEach((node) => {
      node.children.forEach((feedEl) => {
        feeds.push({
          categoryTitle: node.attributes.title,
          title: feedEl.attributes.title,
          url: feedEl.attributes.htmlUrl,
          feedUrl: feedEl.attributes.xmlUrl,
          feedType: feedEl.attributes.type,
        });
      });
    });

    return {
      categories,
      feeds,
    };
  },
};
export default opmlParser;
