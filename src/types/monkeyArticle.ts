export interface MonkeyArticleSummary {
  id: string
  title: string
  createdAt: string
  words: number
  characters: number
  preview: string
}

export interface MonkeyArticle extends MonkeyArticleSummary {
  content: string
}

export interface MonkeyArticlePage {
  articles: MonkeyArticleSummary[]
  nextCursor: string | null
}
