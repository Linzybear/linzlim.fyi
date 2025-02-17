const stylesheet = document.createElement('link');
stylesheet.rel = 'stylesheet';
stylesheet.href = 'index.js.css';
document.head.appendChild(stylesheet)
function mkLightBox( src ) {
    const lb = document.createElement( 'div' );
    lb.classList.add( 'lightbox' );
    const img = document.createElement( 'img' );
    img.src = src;
    lb.appendChild(img)
    document.body.appendChild(lb);
}
document.body.addEventListener( 'click', ( ev ) => {
    if ( ev.target.closest( '.lightbox' ) ) {
        ev.target.closest('.lightbox').remove();
    }
    if ( ev.target.closest( '.gallery a img' ) ) {
        ev.preventDefault();
        const link = ev.target.closest('a');
        if ( link ) {
            mkLightBox( link.getAttribute('href') );
        }
    }
} );