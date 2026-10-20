(function(){
  var KEY = __KEY__, state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { state = {}; }
  var boxes = Array.prototype.slice.call(document.querySelectorAll('input[data-id]'));
  function save(){ try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }
  function refresh(){
    var done = 0, ids = {};
    boxes.forEach(function(b){ if (ids[b.dataset.id]) return; ids[b.dataset.id] = 1; if (state[b.dataset.id]) done++; });
    var total = Object.keys(ids).length;
    document.getElementById('progTxt').textContent = done + ' of ' + total + ' checked';
    document.getElementById('progBar').style.width = (total ? done / total * 100 : 0) + '%';
    document.querySelectorAll('.week').forEach(function(w){
      var bs = w.querySelectorAll('input[data-id]'), d = 0;
      bs.forEach(function(b){ if (state[b.dataset.id]) d++; });
      w.querySelector('.wp').textContent = d + '/' + bs.length;
      w.classList.toggle('done', d === bs.length && bs.length > 0);
    });
  }
  boxes.forEach(function(b){
    b.checked = !!state[b.dataset.id];
    b.addEventListener('change', function(){
      state[b.dataset.id] = b.checked; if (!b.checked) delete state[b.dataset.id];
      boxes.forEach(function(o){ if (o !== b && o.dataset.id === b.dataset.id) o.checked = b.checked; });
      save(); refresh();
    });
  });
  // highlight the current week
  var now = new Date(), cur = null;
  document.querySelectorAll('.week').forEach(function(w){ var s = new Date(w.dataset.start + 'T00:00:00'); if (now >= s) cur = w; });
  var first = new Date(__START__ + 'T00:00:00');
  if (now < first) cur = document.querySelector('.week');
  if (cur) cur.classList.add('current');
  var rb = document.getElementById('reset'), armed = 0;
  rb.addEventListener('click', function(){
    if (!armed) { armed = setTimeout(function(){ armed = 0; rb.textContent = 'Clear my check marks'; }, 4000); rb.textContent = 'Click again to clear them all'; return; }
    clearTimeout(armed); armed = 0; rb.textContent = 'Clear my check marks';
    state = {}; save(); boxes.forEach(function(b){ b.checked = false; }); refresh();
  });
  refresh();
})();
