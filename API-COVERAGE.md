# API coverage

This document maps the package against the public Tumblr API v2 and NPF
documentation. “Covered” means the endpoint path, HTTP method, documented
parameters, and authentication mode are exposed by a client method (or the
`request()` escape hatch).

## Tumblr API v2

### Blog

| Method | Endpoint | Client |
| --- | --- | --- |
| GET | `/v2/blog/{blog}/info` | `blogInfo` |
| GET | `/v2/blog/{blog}/avatar[/size]` | `blogAvatarUrl`, `blogAvatar` |
| GET | `/v2/blog/{blog}/blocks` | `blogBlocks` |
| POST | `/v2/blog/{blog}/blocks` | `blockBlog` |
| POST | `/v2/blog/{blog}/blocks/bulk` | `blockBlogsBulk` |
| DELETE | `/v2/blog/{blog}/blocks` | `removeBlock` |
| GET | `/v2/blog/{blog}/likes` | `blogLikes` |
| GET | `/v2/blog/{blog}/following` | `blogFollowing` |
| GET | `/v2/blog/{blog}/followers` | `blogFollowers` |
| GET | `/v2/blog/{blog}/followed_by` | `blogFollowedBy` |
| GET | `/v2/blog/{blog}/posts` | `blogPosts` |
| GET | `/v2/blog/{blog}/posts/queue` | `blogQueue` |
| POST | `/v2/blog/{blog}/posts/queue/reorder` | `reorderQueue` |
| POST | `/v2/blog/{blog}/posts/queue/shuffle` | `shuffleQueue` |
| GET | `/v2/blog/{blog}/posts/draft` | `blogDrafts` |
| GET | `/v2/blog/{blog}/posts/submission` | `blogSubmissions` |
| GET | `/v2/blog/{blog}/notifications` | `blogNotifications` |
| POST | `/v2/blog/{blog}/post` (legacy) | `createLegacyPost` |
| POST | `/v2/blog/{blog}/post/edit` (legacy) | `editLegacyPost` |
| POST | `/v2/blog/{blog}/post/reblog` (legacy) | `reblog` |
| POST | `/v2/blog/{blog}/posts` (NPF) | `createPost`, `createPostMultipart` |
| GET | `/v2/blog/{blog}/posts/{post-id}` | `post` |
| PUT | `/v2/blog/{blog}/posts/{post-id}` | `editPost`, `editPostMultipart` |
| POST | `/v2/blog/{blog}/post/delete` | `deletePost` |
| POST | `/v2/blog/{blog}/posts/{post-id}/mute` | `mutePost` |
| DELETE | `/v2/blog/{blog}/posts/{post-id}/mute` | `unmutePost` |
| GET | `/v2/blog/{blog}/notes` | `blogNotes` |

### User

| Method | Endpoint | Client |
| --- | --- | --- |
| GET | `/v2/user/info` | `userInfo` |
| GET | `/v2/user/limits` | `userLimits` |
| GET | `/v2/user/dashboard` | `userDashboard` |
| GET | `/v2/user/likes` | `userLikes` |
| GET | `/v2/user/following` | `userFollowing` |
| POST | `/v2/user/follow` | `follow` |
| POST | `/v2/user/unfollow` | `unfollow` |
| POST | `/v2/user/like` | `like` |
| POST | `/v2/user/unlike` | `unlike` |
| GET | `/v2/user/filtered_tags` | `filteredTags` |
| POST | `/v2/user/filtered_tags` | `addFilteredTags` |
| DELETE | `/v2/user/filtered_tags/{tag}` | `removeFilteredTag` |
| GET | `/v2/user/filtered_content` | `filteredContent` |
| POST | `/v2/user/filtered_content` | `addFilteredContent` |
| DELETE | `/v2/user/filtered_content` | `removeFilteredContent` |

### Tagged and oEmbed

| Method | Endpoint | Client |
| --- | --- | --- |
| GET | `/v2/tagged` | `tagged` |
| GET | `https://www.tumblr.com/oembed` | `oembed` (standalone + client method) |

### Communities (beta)

| Method | Endpoint | Client |
| --- | --- | --- |
| GET | `/v2/communities` | `communities` |
| GET | `/v2/communities/{handle}` | `community` |
| PUT | `/v2/communities/{handle}` | `editCommunity` |
| GET | `/v2/communities/{handle}/timeline` | `communityTimeline` |
| GET | `/v2/communities/{handle}/members` | `communityMembers` |
| PUT | `/v2/communities/{handle}/members` | `joinCommunity` |
| DELETE | `/v2/communities/{handle}/members/{blog}` | `leaveCommunity` |
| PUT | `/v2/communities/{handle}/members/{blog}` | `setCommunityMemberRole` |
| PUT | `/v2/communities/{handle}/invitations` | `inviteToCommunity` |
| GET | `/v2/communities/{handle}/invitations` | `communityInvitations` |
| GET | `/v2/communities/{handle}/invitations/{blog}` | `communityInvitation` |
| DELETE | `/v2/communities/{handle}/invitations/{blog}` | `cancelCommunityInvitation` |
| POST | `/v2/communities/{handle}/invite_hash` | `regenerateCommunityInviteHash` |
| PUT | `/v2/communities/{handle}/posts/{post-id}/reactions` | `addCommunityReaction` |
| DELETE | `/v2/communities/{handle}/posts/{post-id}/reactions/{reaction-id}` | `removeCommunityReaction` |
| PUT | `/v2/communities/{handle}/mute` | `muteCommunity` |
| DELETE | `/v2/communities/{handle}/mute` | `unmuteCommunity` |

Community responses are typed as `Community`/records because the beta docs do
not publish a stable field schema. Paths, methods, and documented request
parameters are implemented.

### OAuth

| Method | Endpoint | Client |
| --- | --- | --- |
| POST | `https://www.tumblr.com/oauth/request_token` | `requestToken` |
| GET | `https://www.tumblr.com/oauth/authorize` | `authorizeUrl` |
| GET | `https://www.tumblr.com/oauth/access_token` | `accessToken` |
| GET | `https://www.tumblr.com/oauth2/authorize` | `oauth2AuthorizeUrl` |
| POST | `/v2/oauth2/token` (authorization code) | `oauth2Token` |
| POST | `/v2/oauth2/token` (refresh token) | `refreshOAuth2Token` |
| POST | `/v2/oauth2/exchange` | `exchangeOAuth1ForOAuth2` |

## NPF

| NPF section | Representation | Covered |
| --- | --- | --- |
| Post identification (`id`, `blog`) | `TumblrPost.id`, `id_string`, `blog` | yes |
| Media objects | `MediaObject` | yes |
| Embed iframe objects | `VideoBlock.embed_iframe` | yes |
| Text blocks and subtypes | `TextBlock`, `TextBlockSubtype` | yes |
| Inline formatting | `FormatRange` (`bold`, `italic`, `strikethrough`, `small`, `link`, `mention`, `color`) | yes |
| Image blocks | `ImageBlock` (`media`, `colors`, `feedback_token`, `poster`, `attribution`, `alt_text`, `caption`) | yes |
| GIF posters | `MediaObject.poster`, `ImageBlock.poster` | yes |
| Link blocks | `LinkBlock` | yes |
| Audio blocks | `AudioBlock` | yes |
| Video blocks | `VideoBlock` (`media`, `poster`, `embed_iframe`, `filmstrip`, `can_autoplay_on_cellular`, `duration`) | yes |
| Paywall blocks | `PaywallBlock` (`cta`, `divider`, `disabled`) | yes |
| Post+ plan metadata | `SubscriptionPlan`, `blog.paywall_access`, `paywall_reblog_view` | yes |
| Future block types | `UnknownBlock` + renderer fallback | yes |
| Rows layout / carousel | `LayoutRows` (`weighted`, `carousel`, `truncate_after`) | yes |
| Condensed layout | `LayoutCondensed` | yes |
| Ask layout | `LayoutAsk` | yes |
| Reblog trail / broken items | `PostTrail`, `broken_blog_name` | yes |
| Attributions | `LinkAttribution`, `BlogAttribution`, `PostAttribution`, `AppAttribution` | yes |
| Post content limits | Validated by the API, not enforced client-side | n/a |
| Mapping NPF to legacy types | `isNpfPost`, `hasLegacyContent`, `postFormat` + legacy renderer | yes |

## Deliberate non-goals

- **Rate-limit enforcement.** The docs publish limits; the client retries
  `429`/`5xx` with backoff and honours `Retry-After`, but does not impose a
  client-side quota.
- **Tumblr content/trademark licensing.** The package is unofficial and grants
  no rights to Tumblr content or marks; see `LICENSE` and `README.md`.
- **NPF content-limit validation.** Length/limit checks are left to the API.
- **Streaming media uploads.** Multipart uploads accept `Blob`, byte arrays, or
  strings. Wrap a Node stream in a `Blob` before passing it as `MediaUpload`.
- **Community response field schemas.** Beta endpoints are typed loosely on
  purpose; the documented paths and request parameters are implemented.

## Verification

`npm test` covers the OAuth signature vector, endpoint parameters, legacy and
NPF post bodies, multipart uploads, avatars, oEmbed, filtered tags/content,
communities routes, and OAuth 2.0 flows.
