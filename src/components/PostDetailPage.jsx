import { useState } from 'react'
import { buildCommentTree, profilePath, shortName, timeAgo } from '../lib/community'
import PostCard from './PostCard'

function CommentNode({ comment, profileMap, user, vote, voteMap, onVote, onReply, onDelete, onNavigate, onOpenAuth, depth = 0 }) {
  const [replyOpen, setReplyOpen] = useState(false)
  const [body, setBody] = useState('')
  const [replyBusy, setReplyBusy] = useState(false)
  const author = profileMap[comment.author_id]
  const displayName = author?.username || 'deleted'

  async function submitReply(event) {
    event.preventDefault()
    if (!body.trim() || replyBusy) return
    setReplyBusy(true)
    const saved = await onReply(body.trim(), comment.id)
    setReplyBusy(false)
    if (saved) {
      setBody('')
      setReplyOpen(false)
    }
  }

  return (
    <article className={`thread-comment${depth ? ' thread-comment-child' : ''}`}>
      <div className="thread-comment-vote"><button type="button" className={vote === 1 ? 'voted' : ''} onClick={() => onVote(comment.id, 1)} disabled={!user} aria-label="Upvote comment">▲</button><span>{comment.score ?? 0}</span><button type="button" className={vote === -1 ? 'voted' : ''} onClick={() => onVote(comment.id, -1)} disabled={!user} aria-label="Downvote comment">▼</button></div>
      <div className="thread-comment-content">
        <div className="comment-meta"><a href={profilePath(displayName)} onClick={(event) => { event.preventDefault(); onNavigate(profilePath(displayName)) }}>u/{shortName(displayName)}</a><span>·</span><span>{timeAgo(comment.created_at)}</span>{comment.updated_at && comment.updated_at !== comment.created_at && <span>· edited</span>}</div>
        <p className="thread-comment-body">{comment.is_deleted ? '[deleted]' : comment.body}</p>
        <div className="thread-comment-actions">
          {!comment.is_deleted && <button type="button" onClick={() => user ? setReplyOpen((open) => !open) : onOpenAuth()}>{replyOpen ? 'Cancel reply' : 'Reply'}</button>}
          {user?.id === comment.author_id && !comment.is_deleted && <button type="button" onClick={() => onDelete(comment.id)}>Delete</button>}
        </div>
        {replyOpen && <form className="inline-reply-form" onSubmit={submitReply}><textarea maxLength="10000" rows="3" value={body} onChange={(event) => setBody(event.target.value)} placeholder={`Reply to u/${shortName(displayName)}`} required autoFocus /><div><button type="button" className="button button-quiet" onClick={() => setReplyOpen(false)}>Cancel</button><button className="button button-primary" disabled={replyBusy || !body.trim()}>{replyBusy ? 'Replying…' : 'Reply'}</button></div></form>}
        {comment.children.length > 0 && <div className="thread-replies">{comment.children.map((child) => <CommentNode key={child.id} comment={child} profileMap={profileMap} user={user} voteMap={voteMap} vote={voteMap[child.id] || 0} onVote={onVote} onReply={onReply} onDelete={onDelete} onNavigate={onNavigate} onOpenAuth={onOpenAuth} depth={depth + 1} />)}</div>}
      </div>
    </article>
  )
}

export default function PostDetailPage({ post, community, author, comments, profileMap, user, commentVotes, postVote, saved, loading, error, onPostVote, onCommentVote, onSave, onShare, onNavigate, onReply, onDeleteComment, onEditPost, onDeletePost, onOpenAuth }) {
  const [sort, setSort] = useState('old')
  const [body, setBody] = useState('')
  const [commentBusy, setCommentBusy] = useState(false)
  const tree = buildCommentTree(comments, sort)

  async function submitComment(event) {
    event.preventDefault()
    if (!body.trim() || commentBusy) return
    setCommentBusy(true)
    const savedComment = await onReply(body.trim(), null)
    setCommentBusy(false)
    if (savedComment) setBody('')
  }

  if (!post) return <main className="post-detail-page"><div className="loading-card"><span className="spinner" />{loading ? 'Loading discussion…' : 'This post could not be found.'}</div></main>

  return (
    <main className="post-detail-page">
      <button className="back-link" type="button" onClick={() => onNavigate(community ? `/r/${encodeURIComponent(community.name)}` : '/')}>← Back to {community ? `r/${community.name}` : 'feed'}</button>
      <PostCard post={post} community={community} author={author} user={user} vote={postVote} saved={saved} onVote={onPostVote} onSave={onSave} onShare={onShare} onNavigate={onNavigate} onEdit={onEditPost} onDelete={onDeletePost} />
      <section className="discussion-panel" aria-labelledby="discussion-heading">
        <div className="discussion-header"><div><p className="eyebrow">DISCUSSION</p><h1 id="discussion-heading">{post.comment_count ?? comments.length} comments</h1></div><label className="comment-sort">Sort by <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="old">Old</option><option value="top">Top</option><option value="new">New</option></select></label></div>
        {error && <div className="notice notice-error" role="alert">{error}</div>}
        {user ? <form className="top-level-comment-form" onSubmit={submitComment}><label htmlFor="new-comment">Comment as u/{shortName(profileMap[user.id]?.username || user.email?.split('@')[0])}</label><textarea id="new-comment" maxLength="10000" rows="4" value={body} onChange={(event) => setBody(event.target.value)} placeholder="What are your thoughts?" required /><div className="comment-compose-actions"><span>{body.length}/10,000</span><button className="button button-primary" disabled={commentBusy || !body.trim()}>{commentBusy ? 'Commenting…' : 'Comment'}</button></div></form> : <div className="signin-to-comment"><span>Join the discussion</span><button className="button button-primary" type="button" onClick={onOpenAuth}>Log in or sign up to comment</button></div>}
        {loading ? <div className="loading-card comments-loading"><span className="spinner" />Loading comments…</div> : tree.length ? <div className="comment-thread-list">{tree.map((comment) => <CommentNode key={comment.id} comment={comment} profileMap={profileMap} user={user} voteMap={commentVotes} vote={commentVotes[comment.id] || 0} onVote={onCommentVote} onReply={onReply} onDelete={onDeleteComment} onNavigate={onNavigate} onOpenAuth={onOpenAuth} />)}</div> : <div className="empty-inline"><strong>No comments yet.</strong><span>Be the first to start the discussion.</span></div>}
      </section>
    </main>
  )
}
