import HomeClient from './HomeClient'

type RootPageProps = {
  params: Promise<Record<string, string | string[] | undefined>>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function Page({ params, searchParams }: RootPageProps) {
  await params
  await searchParams
  return <HomeClient />
}
