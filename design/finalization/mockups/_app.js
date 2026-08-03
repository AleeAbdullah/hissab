/* Light/dark toggle. Tokens are CSS variables, so flipping one class on <html>
   re-renders every frame in the file. Frames pinned with .lt or .dk keep their
   mode — that is how the side-by-side comparisons stay comparable. */
(function () {
  var KEY = 'hissab-mode';
  var html = document.documentElement;

  function apply(mode) {
    html.classList.toggle('dk', mode === 'dark');
    var b = document.querySelector('[data-mode-toggle]');
    if (b) b.textContent = mode === 'dark' ? 'Light mode' : 'Dark mode';
  }

  apply(localStorage.getItem(KEY) || 'light');

  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-mode-toggle]')) return;
    var next = html.classList.contains('dk') ? 'light' : 'dark';
    localStorage.setItem(KEY, next);
    apply(next);
  });
})();
