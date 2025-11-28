
const weekdays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const special = ['Exam', 'University Holiday', 'Holiday', 'Tech Immersion Week'];

// Detect page type from URL
function detectPageType() {
    const url = window.location.href.toLowerCase();

    if (url.includes('sem2hkecic')) {
        return 'sem2hkecic';
    } else if (url.includes('sem2hk')) {
        return 'sem2hk';
    } else if (url.includes('sem2sh')) {
        return 'sem2sh';
    } else if (url.includes('sem1')) {
        return 'sem1';
    }

    // Default fallback
    return 'sem1';
}

// Configuration for different page types
const pageConfigs = {
    'sem1': {
        headerClass: 'xl8925285',
        headerText: 'Code',
        lastUpdatedIndex: 2,
        titleSuffix: '',
        courseCodeFix: null
    },
    'sem1ecic': {
        headerClass: 'xl9526745',
        headerText: 'Code',
        lastUpdatedIndex: 2,
        titleSuffix: ' (Sem1, ECIC)',
        courseCodeFix: null,
        preserveLocationCells: true  // Special flag for ECIC two-row layout
    },
    'sem2sh': {
        headerClass: 'xl6415137',
        headerText: 'Course Code',
        lastUpdatedIndex: 3,
        titleSuffix: ' (Sem2, SH)',
        courseCodeFix: (code) => code === "COMP7611A" ? "COMP7611" : code
    },
    'sem2hk': {
        headerClass: 'xl6430258',
        headerText: 'Course Code',
        lastUpdatedIndex: 3,
        titleSuffix: ' (Sem2, HK)',
        courseCodeFix: null
    },
    'sem2hkecic': {
        headerClass: 'xl9126745',
        headerText: 'Course Code',
        lastUpdatedIndex: 3,
        titleSuffix: ' (Sem2, HK ECIC)',
        courseCodeFix: null,
        preserveLocationCells: true  // Special flag for ECIC two-row layout
    }
};

function isBlank(str) {
  return /^\s*$/.test(str);
}

function extractCoursesFromTable(config) {
    const courses = [];

    // Find the course table header row with "Code" or "Course Code"
    const headerCells = document.querySelectorAll(`td.${config.headerClass}`);
    let codeHeaderFound = false;
    let headerRow = null;

    for (let cell of headerCells) {
        if (cell.textContent.trim() === config.headerText) {
            headerRow = cell.parentElement;
            codeHeaderFound = true;
            break;
        }
    }

    if (!codeHeaderFound) return courses;

    // Find all rows after the header that contain course codes
    let currentRow = headerRow.nextElementSibling;
    while (currentRow) {
        const cells = currentRow.querySelectorAll('td');
        if (cells.length > 2) {
            const codeCell = cells[1]; // Code is in the second column (index 1)
            const titleCell = cells[2]; // Title is in the third column (index 2)

            if (codeCell && titleCell) {
                let courseCode = codeCell.textContent.trim();
                const courseTitle = titleCell.textContent.trim();

                // Apply course code fix if needed
                if (config.courseCodeFix) {
                    courseCode = config.courseCodeFix(courseCode);
                }

                // Match course code pattern (e.g., COMP7103A, FITE7410B, DASC7606B, SFEC5101)
                if (/^[A-Z]{4}\d{4}[A-Z]?$/.test(courseCode)) {
                    courses.push({
                        code: courseCode,
                        title: courseTitle
                    });
                }
            }
        }
        currentRow = currentRow.nextElementSibling;
    }

    // Remove duplicates based on course code
    const uniqueCourses = [];
    const seenCodes = new Set();

    for (const course of courses) {
        if (!seenCodes.has(course.code)) {
            seenCodes.add(course.code);
            uniqueCourses.push(course);
        }
    }

    return uniqueCourses;
}

function filter(selectedCourses, config) {
    let allowedTexts = [].concat(selectedCourses).concat(weekdays).concat(digits).concat(special);

    // For ECIC (two-row layout), use special filtering logic
    if (config.preserveLocationCells) {
        // First pass: mark all cells that should be kept
        const cellsToKeep = new Set();

        document.querySelectorAll('td').forEach(td => {
            const text = td.textContent.trim();
            let flag = false;

            for (curCourse of allowedTexts) {
                if (text.startsWith(curCourse)) {
                    flag = true;
                }
            }

            if (isBlank(text)) {
                flag = true;
            }

            if (flag) {
                cellsToKeep.add(td);
            }
        });

        // Second pass: process all cells and preserve location cells (cells right below course cells)
        document.querySelectorAll('td').forEach(td => {
            const text = td.textContent.trim();

            // If this cell should be kept, skip it
            if (cellsToKeep.has(td)) {
                return;
            }

            // Check if the cell above (in the previous row, same column) contains a course code
            const currentRow = td.parentElement;
            const currentCellIndex = Array.from(currentRow.children).indexOf(td);
            const previousRow = currentRow.previousElementSibling;

            if (previousRow) {
                const cellAbove = previousRow.children[currentCellIndex];
                if (cellAbove && cellsToKeep.has(cellAbove)) {
                    const textAbove = cellAbove.textContent.trim();
                    // Check if the cell above contains a selected course code
                    for (const course of selectedCourses) {
                        if (textAbove.startsWith(course)) {
                            // This is a location cell, keep it
                            return;
                        }
                    }
                }
            }

            // Clear this cell
            td.style.background = 'white';
            td.textContent = '';
        });
    } else {
        // Standard filtering logic for other page types
        document.querySelectorAll('td').forEach(td => {
            const text = td.textContent.trim();
            let flag = false;
            for (curCourse of allowedTexts) {
                if (text.startsWith(curCourse)) {
                    flag = true;
                }
            }
            if (isBlank(text)) {
                flag = true;
            }
            if (!flag) {
                //td.style.display = 'none';
                td.style.background = 'white';
                td.textContent = '';
            }
        });
    }
}


// Get URL parameters
function getURLParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        courses: params.get('courses') ? params.get('courses').split(',') : [],
        filter: params.get('filter') === 'true'
    };
}

// Update URL with selected courses
function updateURL(selectedCourses, filterApplied) {
    const url = new URL(window.location);
    if (selectedCourses.length > 0) {
        url.searchParams.set('courses', selectedCourses.join(','));
    } else {
        url.searchParams.delete('courses');
    }
    url.searchParams.set('filter', filterApplied);
    window.history.replaceState({}, '', url);
}

document.addEventListener('DOMContentLoaded', () => {
    // Detect page type and get corresponding config
    const pageType = detectPageType();
    const config = pageConfigs[pageType];

    console.log(`Filter-all.js detected page type: ${pageType}`);

    const lastUpdated = Array.from(document.querySelectorAll("td"))[config.lastUpdatedIndex].innerText;

    // Extract courses from the table
    const availableCourses = extractCoursesFromTable(config);

    // Get URL parameters
    const urlParams = getURLParams();

    let newDiv = document.createElement("div");
    newDiv.style.cssText = 'margin: 20px; padding: 15px; border: 1px solid #ccc; background-color: #f9f9f9;';

    let title = document.createElement("h3");
    title.textContent = "课程过滤器 / Course Filter" + config.titleSuffix + " " + lastUpdated;
    title.style.cssText = 'margin-top: 0; color: #333;';

    let instruction = document.createElement("p");
    instruction.textContent = "选择你想查看的课程，然后点击过滤按钮：";
    instruction.style.cssText = 'margin: 10px 0; color: #666;';

    // Create checkbox container
    let checkboxContainer = document.createElement("div");
    checkboxContainer.style.cssText = 'max-height: 120px; overflow-y: auto; border: 1px solid #ddd; padding: 15px; margin: 10px 0; background-color: white;';

    // Create "Select All" / "Deselect All" buttons
    let selectAllBtn = document.createElement("button");
    selectAllBtn.textContent = "全选";
    selectAllBtn.style.cssText = 'margin-right: 10px; padding: 5px 10px;';

    let deselectAllBtn = document.createElement("button");
    deselectAllBtn.textContent = "全不选";
    deselectAllBtn.style.cssText = 'margin-right: 10px; padding: 5px 10px;';

    // Create checkboxes for each course
    availableCourses.forEach(course => {
        let courseDiv = document.createElement("div");
        courseDiv.style.cssText = 'margin: 5px 0; display: flex; align-items: center; width: 100%;';

        let checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = `course_${course.code}`;
        checkbox.value = course.code;
        checkbox.style.cssText = 'margin-right: 8px; flex-shrink: 0;';
        // Check if this course is in URL parameters
        if (urlParams.courses.includes(course.code)) {
            checkbox.checked = true;
        }

        let label = document.createElement("label");
        label.htmlFor = `course_${course.code}`;

        // Create course code span
        let codeSpan = document.createElement("span");
        codeSpan.textContent = course.code;
        codeSpan.style.cssText = 'font-family: monospace; font-weight: bold; color: #007cba; margin-right: 10px;';

        // Create course title span
        let titleSpan = document.createElement("span");
        titleSpan.textContent = course.title;
        titleSpan.style.cssText = 'color: #333; font-size: 14px;';

        label.appendChild(codeSpan);
        label.appendChild(titleSpan);
        label.style.cssText = 'cursor: pointer; display: flex; align-items: center; padding: 3px 0; flex: 1;';

        courseDiv.appendChild(checkbox);
        courseDiv.appendChild(label);
        checkboxContainer.appendChild(courseDiv);
    });

    // Create share URL section
    let shareDiv = document.createElement("div");
    shareDiv.style.cssText = 'margin: 15px 0; padding: 10px; border: 1px solid #ddd; background-color: #f5f5f5;';

    let shareTitle = document.createElement("h4");
    shareTitle.textContent = "分享链接 / Share URL";
    shareTitle.style.cssText = 'margin: 0 0 10px 0; font-size: 14px; color: #333;';

    let shareInput = document.createElement("input");
    shareInput.type = "text";
    shareInput.readOnly = true;
    shareInput.placeholder = "选择课程后点击「过滤」即可生成分享链接...";
    shareInput.style.cssText = 'width: 85%; padding: 5px; margin-right: 10px; border: 1px solid #ccc;';

    let copyBtn = document.createElement("button");
    copyBtn.textContent = "复制 / Copy";
    copyBtn.style.cssText = 'padding: 5px 10px; background-color: #17a2b8; color: white; border: none; cursor: pointer;';

    shareDiv.appendChild(shareTitle);
    shareDiv.appendChild(shareInput);
    shareDiv.appendChild(copyBtn);

    // Create action buttons
    let buttonContainer = document.createElement("div");
    buttonContainer.style.cssText = 'margin: 15px 0;';

    let filterBtn = document.createElement("button");
    filterBtn.textContent = "过滤 / Filter";
    filterBtn.style.cssText = 'padding: 8px 15px; margin-right: 10px; background-color: #007cba; color: white; border: none; cursor: pointer;';

    let refreshBtn = document.createElement("button");
    refreshBtn.textContent = "重置 / Reset";
    refreshBtn.style.cssText = 'padding: 8px 15px; margin-right: 10px; background-color: #666; color: white; border: none; cursor: pointer;';

    let exportImageBtn = document.createElement("button");
    exportImageBtn.textContent = "导出图像 / Export Image";
    exportImageBtn.style.cssText = 'padding: 8px 15px; background-color: #fd7e14; color: white; border: none; cursor: pointer; display: none;';

    // Event listeners
    selectAllBtn.onclick = () => {
        checkboxContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
    };

    deselectAllBtn.onclick = () => {
        checkboxContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    };

    // Copy URL functionality
    copyBtn.onclick = () => {
        if (shareInput.value) {
            shareInput.select();
            navigator.clipboard.writeText(shareInput.value).then(() => {
                alert('链接已复制到剪贴板 / URL copied to clipboard');
            }).catch(() => {
                // Fallback for older browsers
                document.execCommand('copy');
                alert('链接已复制到剪贴板 / URL copied to clipboard');
            });
        }
    };

    filterBtn.onclick = () => {
        const selectedCourses = [];
        checkboxContainer.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
            selectedCourses.push(cb.value);
        });
        filter(selectedCourses, config);
        updateURL(selectedCourses, true);
        shareInput.value = window.location.href;
        filterBtn.style.display = 'none';
        exportImageBtn.style.display = 'inline-block';
    };

    refreshBtn.onclick = () => {
        const url = new URL(window.location);
        url.searchParams.set('filter', 'false');
        window.location.href = url.toString();
    };

    // Export image functionality
    exportImageBtn.onclick = () => {
        // Use html2canvas library if available, otherwise provide fallback
        if (typeof html2canvas !== 'undefined') {
            const timetableElement = document.querySelector('table') || document.body;
            html2canvas(timetableElement, {
                scale: 1,
                useCORS: true,
                allowTaint: true
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = 'filtered-timetable.png';
                link.href = canvas.toDataURL();
                link.click();
            }).catch(err => {
                console.error('Export failed:', err);
                alert('导出失败，请尝试手动截图 / Export failed, please try manual screenshot');
            });
        } else {
            // Fallback: open print dialog
            window.print();
            alert('请使用浏览器的打印功能保存为PDF，或手动截图 / Please use browser print function to save as PDF, or take manual screenshot');
        }
    };

    // Assemble the interface
    newDiv.appendChild(title);
    newDiv.appendChild(instruction);

    let controlsDiv = document.createElement("div");
    controlsDiv.style.cssText = 'margin: 10px 0;';
    controlsDiv.appendChild(selectAllBtn);
    controlsDiv.appendChild(deselectAllBtn);
    newDiv.appendChild(controlsDiv);

    newDiv.appendChild(checkboxContainer);
    newDiv.appendChild(shareDiv);

    buttonContainer.appendChild(filterBtn);
    buttonContainer.appendChild(refreshBtn);
    buttonContainer.appendChild(exportImageBtn);
    newDiv.appendChild(buttonContainer);

    let body = document.body;
    body.insertBefore(newDiv, body.firstChild);

    // delete all content before the first row of the actual table
    const allRows = document.querySelectorAll('tr')
    for (tr of allRows) {
      if (tr.childNodes[3] && tr.childNodes[3].innerText.trim() == 'MON') {
        break;
      }
      tr.style.display = 'none';
    }

    // Auto-filter if URL parameter filter=true
    if (urlParams.filter && urlParams.courses.length > 0) {
        filter(urlParams.courses, config);
        shareInput.value = window.location.href;
        filterBtn.style.display = 'none';
        exportImageBtn.style.display = 'inline-block';
    }
});
