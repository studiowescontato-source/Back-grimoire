// sprites.js — desenho dos sprites pixel art dos agentes

window.SPRITE_PALETTES = {
  motion:   { body: '#6020b0', skin: '#f0b890', detail: '#9040e0', eye: '#f0d040' },
  '3d':     { body: '#1a6030', skin: '#f0b890', detail: '#30a050', eye: '#40ff80' },
  brand:    { body: '#902040', skin: '#f0b890', detail: '#c03060', eye: '#ff60a0' },
  social:   { body: '#a04010', skin: '#f0b890', detail: '#d06020', eye: '#ffa040' },
  carousel: { body: '#1060a0', skin: '#f0b890', detail: '#2090d0', eye: '#40e0ff' },
  pm:       { body: '#806010', skin: '#e0a070', detail: '#b09030', eye: '#ffe060' },
};

window.drawSprite = function(canvas, type) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const s = 3;
  ctx.clearRect(0, 0, 24, 24);
  const p = window.SPRITE_PALETTES[type] || window.SPRITE_PALETTES.motion;
  const px = (x, y, col) => { ctx.fillStyle = col; ctx.fillRect(x * s, y * s, s, s); };
  const outline = '#1a1208';

  // head
  px(3,0,p.skin); px(4,0,p.skin);
  px(2,1,p.skin); px(3,1,p.skin); px(4,1,p.skin); px(5,1,p.skin);
  px(2,2,p.skin); px(3,2,p.eye);  px(4,2,p.eye);  px(5,2,p.skin);
  px(2,3,p.skin); px(3,3,p.skin); px(4,3,p.skin); px(5,3,p.skin);
  // body
  px(3,4,p.body); px(4,4,p.body);
  px(2,5,p.body); px(3,5,p.body); px(4,5,p.body); px(5,5,p.body);
  px(2,6,p.body); px(3,6,p.detail); px(4,6,p.detail); px(5,6,p.body);
  // arms
  px(1,5,p.skin); px(6,5,p.skin);
  px(1,6,p.skin); px(6,6,p.skin);
  // legs
  px(3,7,p.body); px(4,7,p.body);
  // outline accents
  px(2,0,outline); px(5,0,outline);
  px(1,1,outline); px(6,1,outline);
  px(1,3,outline); px(6,3,outline);
};

window.drawAllSprites = function() {
  Object.keys(window.AGENTS).forEach(type => {
    const canvas = document.getElementById('sp-' + type);
    if (canvas) window.drawSprite(canvas, type);
  });
};
