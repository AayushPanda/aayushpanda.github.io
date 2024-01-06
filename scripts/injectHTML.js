/**
 * Function injects specified HTML file to specified HTML
 * node of the current file
 *
 * @param filePath - a path to a source HTML file to inject
 * @param elem - an HTML element to which this content will
 * be injected
 */
async function injectHTML(filePath,elem) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            return;
        }
        const text = await response.text();
        elem.innerHTML = text;
        // reinject all <script> tags
        // for each <script> tag on injected html
        elem.querySelectorAll("script").forEach(script => {
            // create a new empty <script> tag
            const newScript = document.createElement("script");
            // copy attributes of existing script tag
            // to a new one
            Array.from(script.attributes).forEach(attr =>
                newScript.setAttribute(attr.name, attr.value)
            );
            // inject a content of existing script tag
            // to a new one
            newScript.appendChild(
                document.createTextNode(script.innerHTML)
            )
            // replace existing script tag to a new one
            script.parentNode.replaceChild(newScript, script);
        })
    } catch (err) {
        console.error(err.message);
    }
}

/**
 * Function used to process all HTML tags of the following
 * format: <div include="<filename>"></div>
 *
 * This function injects a content of <filename> to
 * each div with the "include" attribute
 */
function injectAll() {
    document.querySelectorAll("div[include]")
        .forEach((elem) => {
            injectHTML(elem.getAttribute("include"),elem);
        })
}

injectAll();
