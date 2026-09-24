import { fetchWithTimeout } from './http'

interface GitHubContributionDay {
  contributionCount: number
  contributionLevel:
    | 'NONE'
    | 'FIRST_QUARTILE'
    | 'SECOND_QUARTILE'
    | 'THIRD_QUARTILE'
    | 'FOURTH_QUARTILE'
  date: string
  weekday: number
}

interface GitHubContributionWeek {
  contributionDays: GitHubContributionDay[]
  firstDay: string
}

interface GitHubContributionsPayload {
  data?: {
    user?: {
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number
          weeks: GitHubContributionWeek[]
        }
      }
      login: string
    } | null
  }
  errors?: Array<{ message?: string }>
}

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql'

export const fetchGitHubContributions = async (env: Env) => {
  const to = new Date()
  const from = new Date(to)
  from.setUTCFullYear(from.getUTCFullYear() - 1)

  const response = await fetchWithTimeout(
    GITHUB_GRAPHQL_URL,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Anutrium-GitHub-Contributions',
      },
      body: JSON.stringify({
        query: `
          query GitHubContributionCalendar(
            $username: String!
            $from: DateTime!
            $to: DateTime!
          ) {
            user(login: $username) {
              login
              contributionsCollection(from: $from, to: $to) {
                contributionCalendar {
                  totalContributions
                  weeks {
                    firstDay
                    contributionDays {
                      contributionCount
                      contributionLevel
                      date
                      weekday
                    }
                  }
                }
              }
            }
          }
        `,
        variables: {
          username: env.GITHUB_USERNAME,
          from: from.toISOString(),
          to: to.toISOString(),
        },
      }),
    },
    10_000
  )

  const payload = (await response.json()) as GitHubContributionsPayload
  if (!response.ok || payload.errors?.length) {
    throw new Error(
      payload.errors?.[0]?.message ||
        `GitHub GraphQL returned ${response.status}`
    )
  }

  const user = payload.data?.user
  if (!user) throw new Error('GitHub user was not found')

  const calendar = user.contributionsCollection.contributionCalendar
  return {
    username: user.login,
    from: from.toISOString(),
    to: to.toISOString(),
    totalContributions: calendar.totalContributions,
    weeks: calendar.weeks.map((week) => ({
      firstDay: week.firstDay,
      days: week.contributionDays.map((day) => ({
        contributionCount: day.contributionCount,
        contributionLevel: day.contributionLevel,
        date: day.date,
        weekday: day.weekday,
      })),
    })),
    updatedAt: new Date().toISOString(),
  }
}
