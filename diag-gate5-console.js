// Cole no Console (F12) da loja, na ABA NORMAL:
var out = {};
['localStorage','sessionStorage'].forEach(function (s) {
  out[s] = {};
  for (var i = 0; i < window[s].length; i++) {
    var k = window[s].key(i);
    if (/sll|gate|vly|vl_|black/i.test(k)) out[s][k] = window[s].getItem(k);
  }
});
out.cookies = document.cookie.split('; ').filter(function (c) { return /sll|gate|vly|black/i.test(c); });
console.log(JSON.stringify(out, null, 2));