// Data types

interface Feed {
  id?: number;
  title: string;
  url: string;
  feedUrl: string;
  feedType?: string;
  error?: number;
  feedCategoryId?: number;
  categoryTitle?: string;
  hidden?: boolean;
}

interface FeedCategory {
  id?: number;
  title: string;
  text?: string;
  expanded?: boolean;
}

interface FeedReadStat {
  id: number;
  tile: string;
  unreadCount: number;
}

interface FeedCategoryReadStat {
  id: number;
  title: string;
  unreadCount: number;
}

interface Item {
  id?: number;
  title: string;
  read: 0 | 1;
  published: number;
  feedTitle?: string;
  url?: string;
}

// Components

interface HomeProps {
  topMenu: React.RefObject<HTMLDivElement>;
}

interface ItemsTableProps {
  items: Item[];
  selectedItem: Item | undefined;
  selectItem: (
    e:
      | MouseEvent<HTMLAnchorElement, MouseEvent>
      | FocusEvent<HTMLAnchorElement, MouseEvent>,
    item: Item
  ) => void;
}

interface FormattedDateProps {
  pubDate: number;
}

interface FeedsProps {
  topMenu: React.RefObject<HTMLDivElement>;
}

interface FeedsTableProps {
  feeds: Feed[];
  removeFeed: (feedId: number) => void;
}

interface CategoriesMainProps {
  activeNav: string;
  feedCategories: FeedCategory[];
  categoryFeeds: {
    [key: string]: FeedCategory[];
  };
  selectedFeedCategory: FeedCategory | undefined;
  selectFeedCategory: function;
  selectedFeed: Feed | undefined;
  selectFeed: function;
  getTotalUnreadCount: function;
  getUnreadCountForFeedCategory: function;
  getUnreadCountForFeed: function;
}
