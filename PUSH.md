# 적용 방법

원격이 `c139a16`까지 진행돼 있어, 그 위에 커밋 두 개를 얹는 번들입니다.
`dot-blocks-full.zip`은 같은 상태의 전체 폴더입니다 — **`index.html` 하나만 열면
형제 파일이 전부 404가 되니 폴더째 열어야 합니다.**
실제 클론에 cherry-pick으로 올려 충돌 해소와 동작 검증까지 마쳤습니다.

```bash
cd ~/dot-blocks
git fetch origin && git checkout main && git pull        # c139a16까지 맞추기
git pull /경로/dot-blocks-9af16bd.bundle main
git log --oneline -1                                      # 9af16bd 확인
git push origin main
```

## 이 커밋이 하는 일

- `audio-engine.js`: 블록별 오디오 아이콘 7종 (`earcon('piece',{piece})`)
- `index.html`: 위험 경고 핀 2단계 구분, 인트로 난이도 3분할, 새 블록 확인 시간 옵션
- `CHANGELOG.md` / `QA.md`: 항목 추가

원격의 `3ff0d6d`(사각 셀 + 중앙 핀), `c139a16`(퍼즐 트레이), `8e73b0a`(TTS) 변경은
전부 보존됩니다. 병합 후 실제로 띄워 확인했습니다.

## push 후 확인

1. 실기 닷패드에서 블록 이어콘 7종이 구분되는지, 특히 S와 Z (패닝 방향만 반대)
2. 위험 2단계 핀 밀도 변화가 1단계와 손끝에서 구분되는지
3. 새 블록 확인 시간 1.4초가 적절한지
