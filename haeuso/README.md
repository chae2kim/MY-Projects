# 해우소 (解憂所)

자리에서 슬쩍 일어나, 말없이 같이 앉아 있다 가는 온라인 해우소.
3D 사무실 → 팀장실 앞 → 탕비실 → 복도 → 해우소 / 옥상.

- `public/index.html`: 게임 전체 (Three.js, 한 파일)
- `src/worker.js`: Cloudflare Worker + Durable Object. `/ws` 웹소켓으로 접속한 사람들의 위치와 상태를 실시간으로 나눠요.
- `wrangler.jsonc`: 배포 설정

## Cloudflare에 올리기 (대시보드에서 한 번만)

1. Cloudflare 대시보드 → **Workers & Pages** → **Create** → **Import a repository**
2. `chae2kim/MY-Projects` 선택
3. **Root directory**: `haeuso`
4. Build command는 비워 두고, Deploy command는 `npx wrangler deploy`
5. **Deploy**를 누르면 `haeuso.<계정>.workers.dev` 주소가 생겨요

그다음부터는 `main`에 푸시할 때마다 자동으로 다시 배포돼요.

## 내 컴퓨터에서 바로 올리기

```bash
cd haeuso
npm install
npx wrangler login
npx wrangler deploy
```

로컬 테스트: `npx wrangler dev` 후 http://localhost:8787 (탭 두 개로 열면 서로 보여요)
