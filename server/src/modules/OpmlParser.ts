import * as parser from "txml";

const opmlParser = {
  load(opmlString: string) {
    const xlmContent = parser.parse(opmlString);

    const startNode = xlmContent[1].children[1].children;

    // @ts-ignore
    const categories = startNode.map((node) => {
      return {
        title: node.attributes.title,
        text: node.attributes.text,
      };
    });
    
    const feeds: Feed[] = [];
    
    // @ts-ignore
    startNode.forEach((node) => {
      // @ts-ignore
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
