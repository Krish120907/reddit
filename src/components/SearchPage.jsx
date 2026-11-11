import { useState } from 'react'
import PostCard from './PostCard'

const FILTERS = [
  ['all', 'All'],
  ['posts', 'Posts'],
  ['communities', 'Communities'],
  ['people', 'People'],
]

export default function SearchPage({ query, posts, communities, profiles, loading, error, communityMap, profileMap, user, postVotes, savedPostIds, onVote, onSave, onShare, onNavigate, onJoin, memberships, onEdit, onDelete }) {
  const [filter, setFilter] = useState('all')
  const hasResults = posts.length + communities.length + profiles.length > 0

  return (
    <section className="search-page">
      <div className="page-heading-block"><p className="eyebrow">SEARCH REDDIT</p><h1>Results for <span>“{query}”</span></h1><p>Posts, communities, and people matching your search.</p></div>
      <div className="search-tabs" role="tablist" aria-label="Search result types">
        {FILTERS.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={filter === id} className={filter === id ? 'selected' : ''} onClick={() => setFilter(id)}>{label}{id === 'posts' ? ` ${posts.length}` : id === 'communities' ? ` ${communities.length}` : id === 'people' ? ` ${profiles.length}` : ''}</button>)}
      </div>
      {error && <div className="notice notice-error" role="alert"><strong>Search could not load</strong><span>{error}</span></div>}
      {loading ? <div className="loading-card"><span className="spinner" />Searching posts, communities, and profiles…</div> : !hasResults ? <div className="empty-state"><div className="empty-illustration">⌕</div><h2>No results for “{query}”</h2><p>Check the spelling or try a broader search.</p></div> : <div className="search-result-groups">
        {(filter === 'all' || filter === 'posts') && <section className="search-result-section"><h2>Posts <span>{posts.length}</span></h2>{posts.length ? <div className="post-list">{posts.map((post) => <PostCard key={post.id} post={post} community={communityMap[post.community_id]} author={profileMap[post.author_id]} user={user} vote={postVotes[post.id] || 0} saved={savedPostIds.includes(post.id)} onVote={onVote} onSave={onSave} onShare={onShare} onNavigate={onNavigate} onEdit={onEdit} onDelete={onDelete} />)}</div> : <p className="search-no-matches">No matching posts.</p>}</section>}
        {(filter === 'all' || filter === 'communities') && <section className="search-result-section"><h2>Communities <span>{communities.length}</span></h2>{communities.length ? <div className="search-entity-list">{communities.map((community) => <article className="search-entity" key={community.id}><button className="community-badge" type="button" onClick={() => onNavigate(`/r/${encodeURIComponent(community.name)}`)}>{community.name.slice(0, 1).toUpperCase()}</button><button className="search-entity-copy" type="button" onClick={() => onNavigate(`/r/${encodeURIComponent(community.name)}`)}><strong>r/{community.name}</strong><span>{community.description || 'A community for sharing and discussion.'}</span><small>{community.member_count ?? 0} members</small></button><button type="button" className={memberships.includes(community.id) ? 'mini-button joined' : 'mini-button'} onClick={() => onJoin(community)}>{memberships.includes(community.id) ? 'Joined' : 'Join'}</button></article>)}</div> : <p className="search-no-matches">No matching communities.</p>}</section>}
        {(filter === 'all' || filter === 'people') && <section className="search-result-section"><h2>People <span>{profiles.length}</span></h2>{profiles.length ? <div className="search-entity-list">{profiles.map((profile) => <article className="search-entity" key={profile.id}><span className="avatar">{(profile.username || '?').slice(0, 1).toUpperCase()}</span><button className="search-entity-copy" type="button" onClick={() => onNavigate(`/u/${encodeURIComponent(profile.username)}`)}><strong>u/{profile.username}</strong><span>{profile.karma ?? 0} karma</span><small>{profile.followers_count ?? 0} followers</small></button></article>)}</div> : <p className="search-no-matches">No matching people.</p>}</section>}
      </div>}
    </section>
  )
}
