const stylesheet = document.createElement('link');
stylesheet.rel = 'stylesheet';
stylesheet.href = '/index.js.css';
document.head.appendChild(stylesheet);

function arrows(lb) {
    const back = document.createElement( 'span' );
    const fwd = document.createElement( 'span' );
    back.classList.add( 'lightbox-back', 'lightbox-arrow' );
    fwd.classList.add( 'lightbox-fwd', 'lightbox-arrow' );
    back.textContent = '←';
    fwd.textContent = '→';
    lb.prepend(back);
    lb.appendChild(fwd);
}

const LB_DISPLAY_CLASS = 'lightbox--visible';
let lb;

let activeImagesInLightbox = [];

function mkLightBox( src ) {
    let img =  document.createElement( 'img' );
    if ( !lb ) {
        lb = document.createElement( 'div' );
        lb.classList.add( 'lightbox' );
        const frame = document.createElement( 'div' );
        lb.appendChild( frame );
        frame.appendChild(img);
        arrows(frame);
        document.body.appendChild(lb);
    } else {
        img = lb.querySelector( 'img' );
    }
    img.src = src;
    lb.dataset.active = activeImagesInLightbox.indexOf( src );
    lb.classList.add( LB_DISPLAY_CLASS );
    if ( activeImagesInLightbox.length > 1 ) {
        lb.classList.add( 'lightbox--multi' );
    } else {
        lb.classList.remove( 'lightbox--multi' );
    }
}

/**
 * @param {boolean} increment, true for next, false for previous.
 */
function swipeToImage( increment ) {
    if ( lb ) {
        const current = parseInt( lb.dataset.active, 10 );
        let next = increment ? current + 1 : current - 1;
        if ( next === -1 ) {
            next = activeImagesInLightbox.length - 1;
        } else if ( next > activeImagesInLightbox.length - 1 ) {
            next = 0;
        }
        lb.dataset.active = next;
        mkLightBox( activeImagesInLightbox[ next ] );
    }
}

document.body.addEventListener( 'click', ( ev ) => {
    lb = ev.target.closest( '.lightbox' );
    if ( lb ) {
        const arrow = ev.target.closest( '.lightbox-arrow' );
        if ( arrow ) {
            const increment = arrow.classList.contains( 'lightbox-fwd' );
            swipeToImage( increment );
        } else {
            ev.target.closest('.lightbox').classList.remove( LB_DISPLAY_CLASS );
        }
    }
    if ( ev.target.closest( '.gallery a img' ) ) {
        ev.preventDefault();
        const link = ev.target.closest('a');
        const closestGallery = ev.target.closest( '.gallery' );
        if ( closestGallery ) {
            activeImagesInLightbox = Array.from(
                closestGallery.querySelectorAll( 'a' )
            ).map( ( a ) => a.getAttribute( 'href' ) );
        }
        if ( link ) {
            mkLightBox( link.getAttribute('href') );
        }
    }
} );

document.addEventListener('keydown', function(event) {
    if ( lb ) {
        if ( event.key === 'Escape') {
            lb.classList.remove( LB_DISPLAY_CLASS );
        } else if (event.key === 'ArrowLeft') {
            swipeToImage( false );
        } else if (event.key === 'ArrowRight') {
            swipeToImage( true );
        }
    }
} );
