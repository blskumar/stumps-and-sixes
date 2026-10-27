let pass=0,fail=0;const fails=[];
module.exports={check(n,c,d){if(c)pass++;else{fail++;fails.push(n+(d!==undefined?'  ::  '+d:''))}},
 done(title){console.log(`\n=== ${title}: ${pass} passed, ${fail} failed ===`);fails.forEach(f=>console.log('  FAIL: '+f));process.exitCode=fail?1:0;return {pass,fail}}};
