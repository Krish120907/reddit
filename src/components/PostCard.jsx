import { postPath, profilePath, shortName, timeAgo } from '../lib/community'

function localNavigate(event, path, onNavigate) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  onNavigate(path)
}

export default function PostCard({ post, community, author, user, vote = 0, saved = false, onVote, onSave, onShare, onNavigate, onEdit, onDelete }) {
  const authorName = author?.username || 'deleted'
  const communityName = community?.name || 'community'
  const commentsPath = postPath(post)

  return (
    <article className="post-card" data-post-id={post.id}>
      <div className="vote-rail" aria-label="Post votes">
        <button className={`vote-button${vote === 1 ? ' voted' : ''}`} type="button" disabled={!user} onClick={() => onVote(post, 1)} aria-label="Upvote post" title={user ? 'Upvote' : 'Sign in to vote'}>▲</button>
        <span className="vote-score" aria-live="polite">{post.score ?? 0}</span>
        <button className={`vote-button downvote${vote === -1 ? ' voted' : ''}`} type="button" disabled={!user} onClick={() => onVote(post, -1)} aria-label="Downvote post" title={user ? 'Downvote' : 'Sign in to vote'}>▼</button>
      </div>
      <div className="post-main">
        <div className="post-meta">
          <a className="post-community" href={`/r/${encodeURIComponent(communityName)}`} onClick={(event) => localNavigate(event, `/r/${encodeURIComponent(communityName)}`, onNavigate)}><span className="community-dot">{communityName.slice(0, 1).toUpperCase()}</span>r/{communityName}</a>
          <span>·</span><span>Posted by</span>
          <a className="author-link" href={profilePath(authorName)} onClick={(event) => localNavigate(event, profilePath(authorName), onNavigate)}>u/{shortName(authorName)}</a>
          <span>{timeAgo(post.created_at)}</span>
          {post.updated_at && post.updated_at !== post.created_at && <span>· edited</span>}
          {post.is_pinned && <span className="pill pill-pinned">Pinned</span>}
        </div>
        <a className="post-title-button" href={commentsPath} onClick={(event) => localNavigate(event, commentsPath, onNavigate)}>
          <h2 className="post-title">{post.is_spoiler && <span className="pill pill-spoiler">Spoiler</span>}{post.is_nsfw && <span className="pill pill-nsfw">18+</span>}{post.title}</h2>
        </a>
        {post.type === 'link' && post.url && <a className="post-link" href={post.url} target="_blank" rel="noreferrer">↗ {post.url.replace(/^https?:\/\//, '').split('/')[0]}</a>}
        {post.type === 'image' && (post.image_url || post.url) && <a href={post.image_url || post.url} target="_blank" rel="noreferrer"><img className="post-image" src={post.image_url || post.url} alt={post.body || `Image attached to ${post.title}`} loading="lazy" /></a>}
        {post.body && <p className="post-body">{post.body}</p>}
        <div className="post-actions">
          <a href={commentsPath} onClick={(event) => localNavigate(event, commentsPath, onNavigate)}><span>▤</span>{post.comment_count ?? 0} comments</a>
          <button type="button" onClick={() => onShare(post)}><span>↗</span>Share</button>
          <button type="button" onClick={() => onSave(post.id)} aria-pressed={saved}><span>{saved ? '▣' : '▢'}</span>{saved ? 'Saved' : 'Save'}</button>
          {user?.id === post.author_id && <><button type="button" onClick={() => onEdit(post)}>Edit</button><button type="button" onClick={() => onDelete(post)}>Delete</button></>}
        </div>
      </div>
    </article>
  )
}
