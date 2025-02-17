import fs from 'fs';
import imageThumbnail from 'image-thumbnail';

const PUBLIC_ASSETS_DIRECTORY = `public/assets`
const template = fs.readFileSync('template.html').toString();

function generateImageHtml( images ) {
    return images.map( ( { src, alt, href } ) => `<a href="${href}">
    <img alt="${alt}" src="${src}">
</a>`).join("\n");
}
function generateLinksHtml( links ) {
    const linkOrSpan = ( title, href ) => href ?
        `<a target="_blank" href="${href}">${title}</a>` :
        `<span>${title}</span>`;
    return links.map( ( { href, title, embed } ) =>
         `<li>${ embed ? embed : linkOrSpan( title, href )}</li>`).join("\n");
}
function generateTitleHTML( title, href ) {
    if ( href ) {
        return `<a target="_blank" href="${href}">${title}</a>`;
    } else {
        return title;
    }
}

/**
 * Generates a linked list
 *
 * @param {array} links
 * @return {string}
 */
function generateLinkedList( links ) {
    return links.length ? `<ul>
    ${ generateLinksHtml( links ) }
</ul>` : '';
}

/**
 * Generates HTML using a template and data
 *
 * @param {Object} slug
 * @param {string} template
 * @return {string}
 */
function generateHTML( slug, template ) {
    switch ( template ) {
        case 'header':
            return `<h1>${ slug.title }</h1>
<p>${ slug.description }</p>
${generateLinkedList( slug.links )}`;
        default:
            return `<div>
    <span>${ slug.duration }</span>
    <div>
        <h3>${ generateTitleHTML( slug.title, slug.href ) }</h3>
        <p>${ slug.description }</p>
        <div class="gallery">
            ${ generateImageHtml( slug.images ) }
        </div>
    ${ generateLinkedList( slug.links ) }
    </div>
</div>`;
    }
}

function getEmbed(url) {
    const w = 420;
    const h = 240;
    if ( url.indexOf('vimeo.com') > -1 ) {
        return `<iframe src="${url}" width="${w}" height="${h}" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    } else if ( url.indexOf('youtube.com') > -1 ) {
        const ytUrl = `https://www.youtube.com/embed/${url.split('?v=').slice(-1)[0]}`
        return `<p><iframe width="${w} height="${h}" src="${ytUrl}" title="" frameBorder="0"  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"  allowFullScreen></iframe></p>`;
    }
    return undefined;
}
/**
 * Scans a directory and generates a list of links
 */
function makeLinks( path ) {
    const links = fs.readdirSync( path );
    return links.map((file) => {
        if ( file.indexOf('.') === 0 ) {
            return false;
        } else {
            const link = fs.readFileSync(`${path}/${file}`).toString().trim().split( "\n" );
            let href = link[1];
            if ( href && href.charAt(0) !== 'h' && href.charAt(0) !== '/' ) {
                console.warn( `Link at ${path} was in unexpected form` );
                href = undefined;
            }
            return {
                embed: link[1] ? getEmbed( link[1] ) : undefined,
                title: link[0],
                href
            };
        }
    } ).filter( ( link ) => link );
}

function copyImage(from, to) {
    fs.copyFileSync(from, to);
    imageThumbnail(from, {
        height: 90
    } ).then((thumbnail) => {
        const thumbPath = to.split('/')
            .slice( 0, -1 ).join('/') + '/thumb_' + to.split('/').slice(-1);
        fs.writeFileSync(thumbPath, thumbnail)
    })
}

/**
 * Converts a folder to template data for a template.
 *
 * @param {string} projectPath in src folder
 * @param {string} thumbPath without public folder.
 * @return {Object}
 */
function makeSlugFromProjectFolder( projectPath, thumbPath ) {
    let slug = {
        images: [],
        links: []
    };
    const publicProjectPath = `public/${thumbPath}`;
    if ( !fs.existsSync( publicProjectPath ) ) {
        fs.mkdirSync( publicProjectPath );
    }
    fs.readdirSync( projectPath ).forEach((file) => {
        const fileStats = fs.statSync(`${projectPath}/${file}`);
        if ( file.indexOf('.') === 0 ) {
        } else if ( file === 'links' ) {
            slug.links = makeLinks(`${projectPath}/links`);
        } else if ( file === 'description.txt' ) {
            const meta = fs.readFileSync( `${projectPath}/${file}` ).toString().split('\n');
            slug.duration = meta[0];
            slug.title = meta[1];
            slug.href = meta[2];
            slug.description = meta.slice(3).join("\n");
        } else if ( fileStats.isDirectory() ) {
            console.warn( `Unexpected folder found: ${file}`);
        } else {
            slug.images.push( {
                src: `${thumbPath}/thumb_${file}`,
                href: `${thumbPath}/${file}`,
                alt: `Image relating to ${file}`
            });
            copyImage(
                `${projectPath}/${file}`,
                `${publicProjectPath}/${file}`
            );
        }
    });
    return slug;
}

function makeBody( directory ) {
    fs.mkdirSync(`${PUBLIC_ASSETS_DIRECTORY}/${directory}`);
    // Function to get current filenames
    // in directory
    const root = `src/${directory}`;
    const projectDirectories = fs.readdirSync(root);
    const slugs = [];

    if ( fs.existsSync( `${root}/description.txt` )  ) {
        const slug = makeSlugFromProjectFolder(root, `assets/${directory}`);
        if ( slug.title ) {
            slugs.push( slug );
        }
    } else {
        projectDirectories.forEach((projDir) => {
            const filePath = `${root}/${projDir}`;
            const fileStats = fs.statSync( filePath );
            if ( projDir.indexOf('.') === 0 ) {
            return;
            } else if ( fileStats.isDirectory() ) {
                const thumbPath = `assets/${directory}/${projDir}`;
                const slug = makeSlugFromProjectFolder(filePath, thumbPath);
                if ( slug.title ) {
                    slugs.push( slug );
                }
            }
        })
    }
    return slugs
        .sort((a, b) => parseInt( a.duration, 10 ) > parseInt( b.duration, 10 ) ? -1 : 1)
        .map((slug) => generateHTML(slug, directory))
        .join("\n");
}

function make( html ) {
    let newHtml = html;
    // Function to get current filenames
    // in directory
    const directories = fs.readdirSync('src');
    directories.forEach((d) => {
        if ( d.indexOf('.') !== 0 ) {
            newHtml = newHtml.replace( `<!-- ${d} -->`, makeBody(d) )
        }
    })

    return newHtml;
}
if ( fs.existsSync( PUBLIC_ASSETS_DIRECTORY ) ) {
    fs.rmdirSync( PUBLIC_ASSETS_DIRECTORY, { recursive: true, force: true } );
}

fs.mkdirSync( PUBLIC_ASSETS_DIRECTORY );
fs.writeFileSync( `public/wip.html`, make(template) );
