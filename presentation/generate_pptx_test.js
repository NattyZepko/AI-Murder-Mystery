const PptxGenJS = require('pptxgenjs');

function norm(c){ if(!c && c !== '') return undefined; if(typeof c !== 'string') c=String(c); c=c.trim(); if(c==='') return undefined; if(c[0]==='#') return c; return '#'+c }

async function runTest(){
  const pptx = new PptxGenJS();
  const theme={bg:'#F7F9FB', primary:'#1F4E79', accent:'#F28B30'};
  // slide 1
  try{
    let s1 = pptx.addSlide();
    s1.background = { fill: { color: norm(theme.bg) } };
    s1.addText('Test slide 1',{x:1,y:1,fontSize:24,fill:{color:norm(theme.primary)},color:'#fff'});
    await pptx.writeFile({ fileName: 'presentation/test1.pptx' });
    console.log('wrote test1');
  }catch(e){console.error('slide1 fail', e); return}

  // slide 2
  try{
    let s2 = pptx.addSlide();
    s2.background = { fill: { color: norm(theme.bg) } };
    s2.addText('Test slide 2',{x:1,y:1,fontSize:24,fill:{color:norm('#F28B30')},color:'#fff'});
    await pptx.writeFile({ fileName: 'presentation/test2.pptx' });
    console.log('wrote test2');
  }catch(e){console.error('slide2 fail', e); return}

  // slide 3 with many boxes
  try{
    let s3 = pptx.addSlide();
    s3.background = { fill: { color: norm(theme.bg) } };
    s3.addText('Box A',{x:0.5,y:1, w:3, h:1, fill:{color: norm('2D7CB5')}, color:'#fff'});
    s3.addText('Box B',{x:4,y:1, w:3, h:1, fill:{color: norm('4E8BB1')}, color:'#fff'});
    await pptx.writeFile({ fileName: 'presentation/test3.pptx' });
    console.log('wrote test3');
  }catch(e){console.error('slide3 fail', e); return}
}

runTest().catch(console.error);
