import { useState } from 'react'
import { shortName, timeAgo } from '../lib/community'
import PostCard from './PostCard'

export default function ProfilePage({ profile, posts, comments, communityMap, user, isFollowing, loading, onFollow, onNavigate, onVote, postVotes, savedPostIds, onSave, onShare, onEdit, onDelete }) {
  const [tab, setTab] = useState('posts')
  if (loading) return <main className="profile-page"><div className="loading-card"><span className="spinner" />Loading profile…</div></main>
  if (!profile) return <main className="profile-page"><div className="empty-state"><div className="empty-illustration">♙</div><h1>Profile not found</h1><p>This account may not exist or its profile is unavailable.</p><button className="button button-primary" type="button" onClick={() => onNavigate('/')}>Back to home</button></div></main>

  const isOwnProfile = user?.id === profile.id

  return (
    <main className="profile-page">
      <div className="profile-cover" />
      <section className="profile-summary"><span className="avatar profile-avatar">{shortName(profile.username).slice(0, 1).toUpperCase()}</span><div className="profile-summary-main"><p className="eyebrow">REDDIT PROFILE</p><h1>u/{shortName(profile.username)}</h1><p>Member since {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p></div>{!isOwnProfile && <button className={`button ${isFollowing ? 'button-quiet' : 'button-primary'}`} type="button" onClick={() => onFollow(profile)}>{isFollowing ? 'Following' : 'Follow'}</button>}{isOwnProfile && <button className="button button-quiet" type="button" onClick={onNavigate.bind(null, '/')}>Back to home</button>}</section>
      <div className="profile-stats"><div><strong>{profile.karma ?? 0}</strong><span>Karma</span></div><div><strong>{profile.followers_count ?? 0}</strong><span>Followers</span></div><div><strong>{profile.following_count ?? 0}</strong><span>Following</span></div><div><strong>{profile.Contributions_count ?? posts.length + comments.length}</strong><span>Contributions</span></div></div>
      <div className="profile-tabs" role="tablist" aria-label="Profile sections">{[['posts', 'Posts'], ['comments', 'Comments'], ['about', 'About']].map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'selected' : ''} onClick={() => setTab(id)}>{label}</button>)}</div>
      {tab === 'posts' && <section className="post-list profile-post-list">{posts.length ? posts.map((post) => <PostCard key={post.id} post={post} community={communityMap[post.community_id]} author={profile} user={user} vote={postVotes[post.id] || 0} saved={savedPostIds.includes(post.id)} onVote={onVote} onSave={onSave} onShare={onShare} onNavigate={onNavigate} onEdit={onEdit} onDelete={onDelete} />) : <div className="empty-inline"><strong>No posts yet.</strong></div>}</section>}
      {tab === 'comments' && <section className="profile-comment-list">{comments.length ? comments.map((comment) => <article className="profile-comment" key={comment.id}><div className="comment-meta"><span>u/{shortName(profile.username)}</span><span>·</span><span>{timeAgo(comment.created_at)}</span></div><p>{comment.is_deleted ? '[deleted]' : comment.body}</p><button className="text-button" type="button" onClick={() => onNavigate(`/comments/${encodeURIComponent(comment.post_id)}`)}>View discussion →</button></article>) : <div className="empty-inline"><strong>No comments yet.</strong></div>}</section>}
      {tab === 'about' && <section className="profile-about"><h2>About u/{shortName(profile.username)}</h2><p>This member has {posts.length} posts and {comments.length} comments in the community.</p><div><span>Joined</span><strong>{new Date(profile.created_at).toLocaleDateString()}</strong></div><div><span>Karma</span><strong>{profile.karma ?? 0}</strong></div></section>}
    </main>
  )
}
