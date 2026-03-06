"use client"

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import SearchBar from "@/components/Search/SearchBar"
import SearchTypePills from "@/components/Search/SearchTypePills"
import SearchFiltersRow from "@/components/Search/SearchFiltersRow"
import SearchResultsList from "@/components/Search/SearchResultsList"
import SearchResultsSkeleton from "@/components/Search/SearchResultsSkeleton"
import {
  useSearch,
  type SearchType,
  type SearchOrder,
  type FollowingScope,
} from "@/hooks/useSearch"

function cleanStr(v: string | null) {
  return (v || "").trim()
}

function normalizeTypeParam(v: string | null): SearchType {
  const raw = cleanStr(v).toLowerCase()
  if (raw === "user") return "User"
  if (raw === "event") return "Event"
  if (raw === "task") return "Task"
  return "Post"
}

function normalizeOrderParam(v: string | null): SearchOrder {
  const raw = cleanStr(v).toLowerCase()
  return raw === "relevant" ? "relevant" : "recent"
}

function SearchPageInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const type = normalizeTypeParam(sp.get("type"))
  const order = normalizeOrderParam(sp.get("order"))
  const q = cleanStr(sp.get("q"))

  const followingParam = cleanStr(sp.get("following"))
  const following: FollowingScope | undefined =
    followingParam === "friends" ||
    followingParam === "following" ||
    followingParam === "followers"
      ? (followingParam as FollowingScope)
      : undefined

  const [input, setInput] = useState(q)
  const debounceRef = useRef<any>(null)

  useEffect(() => setInput(q), [q])

  const setParam = useCallback(
    (next: Record<string, string | number | null | undefined>) => {
      const nextSp = new URLSearchParams(sp.toString())
      for (const [k, v] of Object.entries(next)) {
        if (v === null || v === undefined || String(v).trim() === "")
          nextSp.delete(k)
        else nextSp.set(k, String(v))
      }
      router.push(`/search?${nextSp.toString()}`)
    },
    [router, sp],
  )

  const onChangeInput = useCallback(
    (v: string) => {
      setInput(v)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        setParam({ q: v.trim() ? v.trim() : null })
      }, 250)
    },
    [setParam],
  )

  const search = useSearch({
    q,
    type,
    order,
    following,
    pageSize: 10, // FIXED: user can't change page size
  })

  const subtitle = useMemo(() => {
    const scope = following ? `Scope: ${following}` : "All results"
    return `${scope} • ${type} • ${order}`
  }, [following, type, order])

  return (
    <main className="pb-20 lg:pb-0">
      <div className="mx-auto min-h-screen max-w-3xl bg-(--dk-paper) lg:border-x lg:border-(--dk-ink)/10">
        <div className="sticky top-0 z-20 border-b border-(--dk-ink)/10 bg-(--dk-paper)/96 backdrop-blur-md">
          <div className="h-0.5 w-full bg-(--dk-sky)/65" />
          <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
            <button
              onClick={() => router.back()}
              className="rounded-lg p-2 transition hover:bg-(--dk-mist)/75"
              aria-label="Back"
            >
              <ArrowLeft size={18} className="text-(--dk-ink)" />
            </button>

            <div className="leading-tight">
              <div className="text-sm font-semibold text-(--dk-ink)">
                Search
              </div>
              <div className="text-xs text-(--dk-slate)">{subtitle}</div>
            </div>
          </div>

          <div className="px-4 pb-3 sm:px-5">
            <SearchBar
              value={input}
              onChange={onChangeInput}
              loading={search.loading || search.loadingMore}
            />
          </div>

          <div className="flex flex-col gap-2 px-4 pb-3 sm:px-5">
            <SearchTypePills
              value={type}
              onChange={(t) => setParam({ type: t })}
            />
            <SearchFiltersRow
              order={order}
              onOrderChange={(v) => setParam({ order: v })}
              following={following}
              onFollowingChange={(v) => setParam({ following: v || null })}
            />
          </div>
        </div>

        {search.loadingFirst ? <SearchResultsSkeleton /> : null}

        {!search.loadingFirst && search.error ? (
          <div className="px-4 py-6 text-sm text-red-500">{search.error}</div>
        ) : null}

        {!search.loadingFirst && !search.error && !search.data.length ? (
          <div className="px-4 py-6 sm:px-5">
            <div className="rounded-xl bg-(--dk-mist)/45 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-(--dk-paper) text-(--dk-sky)">
                  <ArrowLeft size={18} className="rotate-180" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-(--dk-ink)">
                    No results found
                  </div>
                  <div className="text-xs text-(--dk-slate) mt-1">
                    Try a different keyword or adjust filters.
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {!!search.data.length ? (
          <SearchResultsList
            items={search.data}
            type={type}
            hasMore={search.hasMore}
            loadingMore={search.loadingMore}
            onLoadMore={search.loadMore}
          />
        ) : null}
      </div>
    </main>
  )
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="pb-20 lg:pb-0">
          <div className="mx-auto min-h-screen max-w-3xl bg-(--dk-paper) lg:border-x lg:border-(--dk-ink)/10">
            <div className="px-4 py-6 text-sm text-(--dk-slate)">Loading…</div>
          </div>
        </main>
      }
    >
      <SearchPageInner />
    </Suspense>
  )
}
