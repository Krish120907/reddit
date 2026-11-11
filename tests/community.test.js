import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCommentTree, escapeLikeTerm, postPath, rankPosts, slugify } from '../src/lib/community.js'

test('search terms escape LIKE wildcard characters', () => {
  assert.equal(escapeLikeTerm('100%_real\\test'), '100\\%\\_real\\\\test')
})

test('post paths have stable readable slugs', () => {
  assert.equal(slugify('Hello, Reddit!'), 'hello-reddit')
  assert.equal(postPath({ id: 'abc-123', title: 'Hello, Reddit!' }), '/comments/abc-123/hello-reddit')
})

test('post ranking handles new, top, hot, and pinned posts without mutating input', () => {
  const now = Date.parse('2026-11-11T00:00:00Z')
  const posts = [
    { id: 'old', created_at: '2026-11-10T00:00:00Z', score: 10 },
    { id: 'new', created_at: '2026-11-10T23:00:00Z', score: 1 },
    { id: 'pinned', created_at: '2026-11-09T00:00:00Z', score: 0, is_pinned: true },
  ]
  assert.deepEqual(rankPosts(posts, 'new', now).map((post) => post.id), ['pinned', 'new', 'old'])
  assert.deepEqual(rankPosts(posts, 'top', now).map((post) => post.id), ['pinned', 'old', 'new'])
  assert.equal(posts[0].id, 'old')
})

test('comment tree nests replies, sorts by requested order, and keeps orphaned replies visible', () => {
  const comments = [
    { id: 'reply', parent_id: 'root', created_at: '2026-11-11T00:02:00Z', score: 3 },
    { id: 'orphan', parent_id: 'missing', created_at: '2026-11-11T00:03:00Z', score: 0 },
    { id: 'root', parent_id: null, created_at: '2026-11-11T00:01:00Z', score: 1 },
  ]
  const tree = buildCommentTree(comments)
  assert.deepEqual(tree.map((comment) => comment.id), ['root', 'orphan'])
  assert.deepEqual(tree[0].children.map((comment) => comment.id), ['reply'])
  assert.equal(comments[0].children, undefined)
})

test('comment tree breaks malformed parent cycles instead of recursing forever', () => {
  const tree = buildCommentTree([
    { id: 'a', parent_id: 'b', created_at: '2026-11-11T00:00:00Z' },
    { id: 'b', parent_id: 'a', created_at: '2026-11-11T00:01:00Z' },
  ])
  assert.equal(tree.length, 1)
  assert.equal(tree[0].children.length, 1)
})
