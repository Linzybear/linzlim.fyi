import fs from 'fs';
import sharp from 'sharp';

const PUBLIC_ASSETS_DIRECTORY = `public/assets`
const PUBLIC_PROJECT_DIR = `public/projects`;
const template = fs.readFileSync('template.html').toString();
const pageTemplate = fs.readFileSync('pageTemplate.html').toString();

const getPagePathFromSlugTitle = ( title ) =>
    `${title.replace(/[→&:/"']/g, '' ).replace(/ /g, '_' )}.html`;

function generateImageHtml( images, useFullSize ) {
    return images.map( ( { src, alt, href } ) => `<a href="${href}">
    <img loading="lazy" alt="${alt}" src="${useFullSize ? href : src}">
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
    let target = `target="_blank"`;
    if ( !href ) {
        href = `/projects/${getPagePathFromSlugTitle(title)}`;
        target = '';
    }
    return `<a ${target} href="${href}">${title}</a>`;
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
    const imageGallery =  ( fullSize ) => `<div class="gallery gallery--${ fullSize ? 'full' : 'compact'}">${ generateImageHtml( slug.images, fullSize ) }</div>`;
    const linkList = generateLinkedList( slug.links );

    switch ( template ) {
        case 'header':
            return `<h1><a href="/">${ slug.title }</a></h1>
${ slug.description }
${generateLinkedList( slug.links )}`;
        case 'overview':
            return `
<h2>${ slug.title }</h2>
${ slug.description }
${linkList}
${imageGallery( true )}`;
        default:
            return `<div class="experience">
    <span>${ slug.duration }</span>
    <div>
        <h3>${ generateTitleHTML( slug.title, slug.href ) }</h3>
        ${ slug.summary }
        ${ imageGallery() }
    </div>
</div>`;
    }
}

function getEmbed(url) {
    const w = 420;
    const h = 240;
    if ( url.indexOf('youtube.com') > -1 ) {
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
            if ( href && !href.startsWith('http') && !href.startsWith('/') && !href.startsWith('mailto:') ) {
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

function makeThumbnail(from, to) {
    const fileOptions = {};
    if ( from.endsWith('.gif' ) ) {
        fileOptions.animated = true;
        fileOptions.pages = -1;
    }
    sharp( from, fileOptions )
        .resize( {
                height: 90
        } ).toFile( to );
}

function copyImage(from, to) {
    fs.copyFileSync(from, to);
    const thumbPath = to.split('/')
        .slice( 0, -1 ).join('/') + '/thumb_' + to.split('/').slice(-1);
    makeThumbnail( from, thumbPath );
}

/**
 * Convert text to html.
 *
 * @param {string} text
 * @return {string}
 */
function toHtml( text ) {
    return text.trim().split( "\n\n" )
        .map( ( paraText ) => `<p>${paraText}</p>` ).join('\n');
}
/**
 * Converts a folder to template data for a template.
 *
 * @param {string} projectPath in src folder
 * @param {string} thumbPath without public folder.
 * @param {boolean} [summarize=true]
 * @return {Object}
 */
function makeSlugFromProjectFolder( projectPath, thumbPath, summarize = true ) {
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
            const slugText = meta.slice(3);
            const fullDescription = slugText.join("\n");
            const slugDescription = slugText.filter((t) => t)[0] || '';
            slug.summaryText = summarize ?
                slugDescription.trim() : fullDescription;
            slug.summary = toHtml( slug.summaryText );
            slug.description = toHtml( fullDescription );
        } else if ( fileStats.isDirectory() ) {
            console.warn( `Unexpected folder found: ${file}`);
        } else {
            slug.images.push( {
                src: `/${thumbPath}/thumb_${file}`,
                href: `/${thumbPath}/${file}`,
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

function makeSubpage( slug, headerHTML ) {
    let result = pageTemplate.replace(
        '<!-- header -->', headerHTML
    ).replace(
        '<!-- overview -->', generateHTML( slug, 'overview' )
    );
    Object.keys( slug ).forEach( ( key ) => {
        result = result.replaceAll( `<!-- ${ key } -->`, slug[ key ] );
    } );
    let image;
    try {
        image = slug.images[ 0 ].src;
    } catch ( e ) {
        image = '';
    }
    result = result.replaceAll( `<!-- image -->`, image );
    return result;
}

function makeIndexBodyAndSubPages( directory, header = '', summarize = true ) {
    fs.mkdirSync(`${PUBLIC_ASSETS_DIRECTORY}/${directory}`);
    // Function to get current filenames
    // in directory
    const root = `src/${directory}`;
    const projectDirectories = fs.readdirSync(root);
    const slugs = [];

    if ( fs.existsSync( `${root}/description.txt` )  ) {
        const slug = makeSlugFromProjectFolder(root, `assets/${directory}`, summarize);
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
                const slug = makeSlugFromProjectFolder(filePath, thumbPath, summarize);
                if ( slug.title ) {
                    slugs.push( slug );
                }
            }
        })
    }
    slugs.forEach((slug) => {
        const path = getPagePathFromSlugTitle( slug.title );
        fs.writeFileSync( `${PUBLIC_PROJECT_DIR}/${path}`, makeSubpage(slug, header) );
    });
    return slugs
        .sort((a, b) => {
            const aMatch = a.duration.split( '-' );
            const bMatch = b.duration.split( '-' );
            const aStart = aMatch.length === 2 ? aMatch[0] : a.duration;
            const bStart = bMatch.length === 2 ? bMatch[0] : b.duration;
            let aEnd = aMatch.length === 2 ? aMatch[1] : aStart;
            let bEnd = bMatch.length === 2 ? bMatch[1] : bStart;
            if ( aEnd && aEnd.length === 2 ) {
                aEnd = `${aStart.slice(0, 2)}${aEnd}`;
            }
            if ( bEnd && bEnd.length === 2 ) {
                bEnd = `${bStart.slice(0, 2)}${bEnd}`;
            }
            if ( bEnd === aEnd ) {
                return bStart < aStart ? -1 : 1;
            }
            return parseInt( aEnd, 10 ) > parseInt( bEnd, 10 ) ? -1 : 1
        })
        .map((slug) => generateHTML(slug, directory))
        .join("\n");
}

function make( html, summarize = true ) {
    let newHtml = html;
    // Function to get current filenames
    // in directory
    const directories = fs.readdirSync('src');
    const header = makeIndexBodyAndSubPages( 'header', '', summarize );
    directories.forEach((d) => {
        if ( d.indexOf('.') !== 0 ) {
            const replacement = d === 'header' ? header : makeIndexBodyAndSubPages(d, header, summarize);
            newHtml = newHtml.replace( `<!-- ${d} -->`, replacement )
        }
    })

    fs.writeFileSync( `public/index.html`, newHtml );
}
if ( fs.existsSync( PUBLIC_ASSETS_DIRECTORY ) ) {
    fs.rmdirSync( PUBLIC_ASSETS_DIRECTORY, { recursive: true, force: true } );
}

if ( fs.existsSync( PUBLIC_PROJECT_DIR ) ) {
    fs.rmdirSync( PUBLIC_PROJECT_DIR, { recursive: true, force: true } );
}

fs.mkdirSync( PUBLIC_PROJECT_DIR );
fs.mkdirSync( PUBLIC_ASSETS_DIRECTORY );
make(template, /* summarize portfolio */ true);
