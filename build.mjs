import fs from 'fs';
import imageThumbnail from 'image-thumbnail';

const PUBLIC_PROJECT_DIRECTORY = `public/projects`
const template = fs.readFileSync('template.html').toString();

function generateImageHtml( images ) {
    return images.map( ( { src, alt, href } ) => `<a href="${href}">
    <img alt="${alt}" src="${src}">
</a>`).join("\n");
}
function generateLinksHtml( links ) {
    return links.map( ( { href, title, embed } ) =>
         `<li>${ embed ? embed : `<a target="_blank" href="${href}">${title}</a>`}</li>`).join("\n");
}
function generateTitleHTML( title, href ) {
    if ( href ) {
        return `<a target="_blank" href="${href}">${title}</a>`;
    } else {
        return title;
    }
}
function generateHTML( slug ) {
    return `<div>
    <span>${ slug.duration }</span>
    <div>
        <h3>${ generateTitleHTML( slug.title, slug.href ) }</h3>
        <p>${ slug.description }</p>
        <div class="gallery">
            ${ generateImageHtml( slug.images ) }
        </div>
        <ul>
            ${ generateLinksHtml( slug.links ) }
        </ul>
    </div>
</div>`;
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
            if ( link.length === 1 ) {
                console.warn( `Link ${path} is in unexpected form.` );
                return false;
            }
            return {
                embed: getEmbed( link[1] ),
                title: link[0],
                href: link[1]
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
function makeBody( directory ) {
    fs.mkdirSync(`${PUBLIC_PROJECT_DIRECTORY}/${directory}`);
    // Function to get current filenames
    // in directory
    const root = `src/${directory}`;
    const projectDirectories = fs.readdirSync(root);
    const slugs = [];
    projectDirectories.forEach((projDir) => {
        if ( projDir.indexOf('.') === 0 ) {
           return;
        }
        let slug = {
            images: [],
            links: []
        };
        const projectPath = `${root}/${projDir}`;
        const publicProjectPath = `${PUBLIC_PROJECT_DIRECTORY}/${directory}/${projDir}`;
        fs.mkdirSync( publicProjectPath );
        fs.readdirSync(projectPath).forEach((file) => {
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
                    src: `projects/${directory}/${projDir}/thumb_${file}`,
                    href: `projects/${directory}/${projDir}/${file}`,
                    alt: `Image relating to ${file}`
                });
                copyImage(
                    `${projectPath}/${file}`,
                    `${publicProjectPath}/${file}`
                );
            }
        });
        if ( slug.title ) {
            slugs.push( slug );
        }
    })
    return slugs
        .sort((a, b) => parseInt( a.duration, 10 ) > parseInt( b.duration, 10 ) ? -1 : 1)
        .map((slug) => generateHTML(slug))
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
if ( fs.existsSync( PUBLIC_PROJECT_DIRECTORY ) ) {
    fs.rmdirSync( PUBLIC_PROJECT_DIRECTORY, { recursive: true, force: true } );
}

fs.mkdirSync( PUBLIC_PROJECT_DIRECTORY );
fs.writeFileSync( `public/wip.html`, make(template) );
