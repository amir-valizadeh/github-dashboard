"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";

interface User {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
}

export default function HomePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isInitialized, setIsInitialized] = useState(false); // Track initialization
  const observer = useRef<IntersectionObserver | undefined>(undefined);

  const fetchUsers = useCallback(async (pageNum: number) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      }
      setError(null);

      const response = await fetch(
        `https://api.github.com/users?since=${(pageNum - 1) * 30}&per_page=30`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.length === 0) {
        setHasMore(false);
        return;
      }

      if (pageNum === 1) {
        setUsers(data);
        setFilteredUsers(data);
        setIsInitialized(true); // Mark as initialized immediately
      } else {
        setUsers((prevUsers) => {
          // Remove duplicates by filtering out users that already exist
          const existingIds = new Set(prevUsers.map((user) => user.id));
          const uniqueNewUsers = data.filter(
            (user: User) => !existingIds.has(user.id)
          );
          const newUsers = [...prevUsers, ...uniqueNewUsers];
          setFilteredUsers(newUsers);
          return newUsers;
        });
      }

      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, []);

  const searchUsers = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setIsSearching(false);
        setSearchResults([]);
        setFilteredUsers(users);
        return;
      }

      try {
        setIsSearching(true);
        setError(null);
        // Don't clear filteredUsers immediately, keep showing current list while searching

        const response = await fetch(
          `https://api.github.com/search/users?q=${encodeURIComponent(
            query
          )}&per_page=30`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const searchItems = data.items || [];
        setSearchResults(searchItems);
        setFilteredUsers(searchItems);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to search users");
        setSearchResults([]);
        // Keep showing original users if search fails
        if (!query.trim()) {
          setFilteredUsers(users);
        }
      } finally {
        setIsSearching(false);
      }
    },
    [users]
  );

  useEffect(() => {
    // Only fetch on client side
    if (typeof window !== "undefined") {
      fetchUsers(1);
    }
  }, [fetchUsers]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers(searchQuery);
      } else {
        setIsSearching(false);
        setSearchResults([]);
        setFilteredUsers(users);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, users, searchUsers]);

  const lastUserRef = useCallback(
    (node: HTMLDivElement) => {
      if (loading || searchQuery.trim()) return;

      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          fetchUsers(page + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, hasMore, page, searchQuery, fetchUsers]
  );

  const retryFetch = () => {
    setError(null);
    fetchUsers(1);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setIsSearching(false);
    setSearchResults([]);
    setFilteredUsers(users);
    setError(null);
  };

  // Show loading state only on initial load
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center py-32">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                  <div
                    className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"
                    style={{
                      animationDirection: "reverse",
                      animationDuration: "1.5s",
                    }}></div>
                </div>
                <div className="text-center">
                  <span className="text-xl font-medium text-slate-900">
                    Loading GitHub Users
                  </span>
                  <p className="text-sm text-slate-600 mt-2">
                    Please wait while we fetch the latest data
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="bg-slate-900 p-3 rounded-2xl">
              <svg
                className="w-8 h-8 text-white"
                fill="currentColor"
                viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </div>
            <h1 className="text-5xl font-bold text-slate-900">GitHub Users</h1>
          </div>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Discover and explore GitHub profiles. Click on any user to view
            their detailed profile, repositories, and more.
          </p>

          {/* Infinite Scroll Indicator */}
          <div className="mt-8 flex justify-center">
            <div className="bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-slate-200/50">
              <div className="flex items-center gap-3 text-slate-600">
                <div className="relative">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
                </div>
                <span className="text-sm font-medium">
                  Scroll down to load more users
                </span>
                <div className="animate-bounce">
                  <svg
                    className="w-4 h-4 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 mb-8">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-12 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder-slate-500"
                placeholder="Search GitHub users by username..."
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Search Status */}
            {searchQuery && (
              <div className="mt-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {isSearching ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <span className="text-slate-600">Searching...</span>
                    </>
                  ) : (
                    <span className="text-slate-600">
                      {searchResults.length > 0
                        ? `Found ${searchResults.length} user${
                            searchResults.length === 1 ? "" : "s"
                          }`
                        : "No users found"}
                    </span>
                  )}
                </div>
                {searchResults.length > 0 && (
                  <button
                    onClick={clearSearch}
                    className="text-blue-600 hover:text-blue-800 font-medium">
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-xl">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  {searchQuery ? searchResults.length : users.length}
                </div>
                <div className="text-sm text-slate-600">
                  {searchQuery ? "Search Results" : "Total Users"}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-600">Powered by</div>
              <div className="text-lg font-semibold text-slate-900">
                GitHub API
              </div>
            </div>
          </div>

          {/* Live Activity Indicator */}
          {loading && !searchQuery && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-blue-600">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}></div>
                  <div
                    className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}></div>
                </div>
                <span className="text-sm font-medium">
                  Loading more users...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-3">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-red-900">
                Error Loading Users
              </h3>
            </div>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={retryFetch}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
              Try Again
            </button>
          </div>
        )}

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredUsers.map((user: User, index: number) => {
            if (filteredUsers.length === index + 1 && !searchQuery) {
              return (
                <div
                  ref={lastUserRef}
                  key={`${user.id}-${index}-last`}
                  className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                  {/* User Avatar */}
                  <div className="relative p-6 text-center bg-gradient-to-br from-slate-50 to-slate-100">
                    <div className="relative inline-block">
                      <Image
                        src={user.avatar_url}
                        alt={user.login}
                        width={80}
                        height={80}
                        className="rounded-full border-4 border-white shadow-lg group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white"></div>
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="p-6 text-center">
                    <h2 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
                      {user.login}
                    </h2>

                    {/* GitHub Profile Link */}
                    <div className="mb-4">
                      <Link
                        href={user.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm">
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        View on GitHub
                      </Link>
                    </div>

                    {/* View Profile Button */}
                    <Link href={`/users/${user.login}`}>
                      <button className="w-full bg-slate-900 text-white py-3 px-4 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 font-medium group-hover:bg-blue-600 group-hover:shadow-lg">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        View Profile
                      </button>
                    </Link>
                  </div>
                </div>
              );
            } else {
              return (
                <div
                  key={`${user.id}-${index}`}
                  className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                  {/* User Avatar */}
                  <div className="relative p-6 text-center bg-gradient-to-br from-slate-50 to-slate-100">
                    <div className="relative inline-block">
                      <Image
                        src={user.avatar_url}
                        alt={user.login}
                        width={80}
                        height={80}
                        className="rounded-full border-4 border-white shadow-lg group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white"></div>
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="p-6 text-center">
                    <h2 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
                      {user.login}
                    </h2>

                    {/* GitHub Profile Link */}
                    <div className="mb-4">
                      <Link
                        href={user.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm">
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        View on GitHub
                      </Link>
                    </div>

                    {/* View Profile Button */}
                    <Link href={`/users/${user.login}`}>
                      <button className="w-full bg-slate-900 text-white py-3 px-4 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 font-medium group-hover:bg-blue-600 group-hover:shadow-lg">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        View Profile
                      </button>
                    </Link>
                  </div>
                </div>
              );
            }
          })}
        </div>

        {/* Loading Indicator */}
        {loading && !searchQuery && (
          <div className="flex justify-center items-center py-12">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                  <div
                    className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"
                    style={{
                      animationDirection: "reverse",
                      animationDuration: "1.5s",
                    }}></div>
                </div>
                <div className="text-center">
                  <span className="text-lg font-medium text-slate-900">
                    Loading more users...
                  </span>
                  <p className="text-sm text-slate-600 mt-1">
                    Please wait while we fetch the next batch
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* End of Results */}
        {!hasMore && users.length > 0 && !searchQuery && (
          <div className="text-center py-12">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
              <div className="flex items-center justify-center gap-3 mb-4">
                <svg
                  className="w-6 h-6 text-slate-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-slate-900">
                  All Users Loaded
                </h3>
              </div>
              <p className="text-slate-600">
                You&apos;ve reached the end of the available GitHub users. Check
                back later for more!
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
            <div className="flex items-center justify-center gap-3 mb-4">
              <svg
                className="w-6 h-6 text-slate-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-slate-900">
                About This Dashboard
              </h3>
            </div>
            <p className="text-slate-600 max-w-2xl mx-auto">
              This dashboard displays a curated list of GitHub users fetched
              from the GitHub API. Each user card shows their avatar, username,
              and provides quick access to their GitHub profile and detailed
              dashboard view. Use the search bar to find specific users or
              scroll down to load more users automatically!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
