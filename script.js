// State management
let tasks;
try {
    tasks = JSON.parse(localStorage.getItem('tasks')) || {};
} catch (e) {
    tasks = {};
}
let selectedDay = 'Monday';

// DOM Elements
const daysNav = document.querySelector('.days-nav');
const addTaskBtn = document.getElementById('add-task-btn');
const taskForm = document.getElementById('task-form');
const tasksContainer = document.querySelector('.tasks-container');
const notification = document.getElementById('notification');

// Initialize the app
function init() {
    renderTasks();
    setupEventListeners();
    checkOverdueTasks();
    setInterval(checkOverdueTasks, 60000); // Check every minute
    highlightCurrentDay();
}

// Event Listeners
function setupEventListeners() {
    if (daysNav) {
        daysNav.addEventListener('click', handleDayClick);
    }
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', toggleTaskForm);
    }
    const saveTaskBtn = document.getElementById('save-task');
    if (saveTaskBtn) {
        saveTaskBtn.addEventListener('click', handleSaveTask);
    }
    const cancelTaskBtn = document.getElementById('cancel-task');
    if (cancelTaskBtn) {
        cancelTaskBtn.addEventListener('click', toggleTaskForm);
    }
    if (tasksContainer) {
        tasksContainer.addEventListener('click', handleTaskAction);
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !taskForm.classList.contains('hidden')) {
            toggleTaskForm();
        }
        if (e.key === 'n' && e.ctrlKey) {
            e.preventDefault();
            if (taskForm.classList.contains('hidden')) {
                toggleTaskForm();
            }
        }
    });

    // Add smooth scrolling for day navigation
    document.querySelectorAll('.day-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            tasksContainer.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// Highlight current day
function highlightCurrentDay() {
    const today = new Date().toLocaleString('en-US', { weekday: 'long' });
    const todayButton = document.querySelector(`[data-day="${today}"]`);
    if (todayButton) {
        todayButton.classList.add('active');
        selectedDay = today;
        renderTasks();
    }
}

// Handle day selection
function handleDayClick(e) {
    if (e.target.classList.contains('day-btn')) {
        document.querySelector('.day-btn.active')?.classList.remove('active');
        e.target.classList.add('active');
        selectedDay = e.target.dataset.day;
        renderTasks();
    }
}

// Toggle task form visibility
function toggleTaskForm() {
    const isHidden = taskForm.classList.contains('hidden');
    if (isHidden) {
        taskForm.classList.remove('hidden');
        document.getElementById('task-title').focus();
        // Set default time to next half hour
        const now = new Date();
        now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30);
        document.getElementById('task-time').value = now.toTimeString().slice(0, 5);
        // Smooth animation
        requestAnimationFrame(() => {
            taskForm.style.transform = 'scaleY(1)';
            taskForm.style.opacity = '1';
        });
    } else {
        taskForm.style.transform = 'scaleY(0)';
        taskForm.style.opacity = '0';
        setTimeout(() => {
            taskForm.classList.add('hidden');
        }, 300);
    }
}

// Handle saving new task
function handleSaveTask() {
    const title = document.getElementById('task-title').value.trim();
    const time = document.getElementById('task-time').value;
    const duration = document.getElementById('task-duration').value;
    const description = document.getElementById('task-description')?.value.trim() || '';
    const priority = document.getElementById('task-priority').value || 'medium';

    if (!title || !time) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    const task = {
        id: Date.now().toString(),
        title,
        time,
        duration: parseInt(duration),
        description,
        priority,
        completed: false,
        createdAt: new Date().toISOString()
    };

    // Ensure tasks[selectedDay] is an array
    if (!Array.isArray(tasks[selectedDay])) {
        tasks[selectedDay] = [];
    }

    // Check for time conflicts
    const timeConflict = checkTimeConflict(task);
    if (timeConflict) {
        showNotification(`Time conflict with task "${timeConflict.title}"`, 'error');
        return;
    }

    tasks[selectedDay].push(task);
    saveTasks();
    renderTasks();
    toggleTaskForm();
    resetForm();
    showNotification('Task added successfully', 'success');
}

// Check for time conflicts
function checkTimeConflict(newTask) {
    if (!Array.isArray(tasks[selectedDay])) {
        return false;
    }

    const newTaskStart = new Date('1970/01/01 ' + newTask.time);
    const newTaskEnd = new Date(newTaskStart.getTime() + newTask.duration * 60000);

    return tasks[selectedDay].find(task => {
        if (task.id === newTask.id) return false;

        const taskStart = new Date('1970/01/01 ' + task.time);
        const taskEnd = new Date(taskStart.getTime() + task.duration * 60000);

        return (newTaskStart < taskEnd && newTaskEnd > taskStart);
    });
}

// Check for overdue tasks
function checkOverdueTasks() {
    const now = new Date();
    const today = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
    const currentTime = now.toTimeString().slice(0, 5);

    if (Array.isArray(tasks[today])) {
        tasks[today].forEach(task => {
            if (!task.completed) {
                const taskTime = new Date('1970/01/01 ' + task.time);
                const taskEndTime = new Date(taskTime.getTime() + task.duration * 60000);
                const currentDateTime = new Date('1970/01/01 ' + currentTime);

                if (currentDateTime > taskEndTime) {
                    showNotification(`Task "${task.title}" is overdue!`, 'error');
                } else if (currentDateTime >= taskTime && currentDateTime <= taskEndTime) {
                    showNotification(`Task "${task.title}" is currently in progress!`, 'warning');
                } else if (taskTime - currentDateTime <= 900000) { // 15 minutes
                    showNotification(`Task "${task.title}" starts in less than 15 minutes!`, 'warning');
                }
            }
        });
    }
}

// Handle task actions (complete/delete)
function handleTaskAction(e) {
    const taskCard = e.target.closest('.task-card');
    if (!taskCard) return;

    const taskId = taskCard.dataset.id;
    const taskIndex = tasks[selectedDay].findIndex(task => task.id === taskId);

    if (e.target.classList.contains('complete-btn')) {
        tasks[selectedDay][taskIndex].completed = !tasks[selectedDay][taskIndex].completed;
        const status = tasks[selectedDay][taskIndex].completed ? 'completed' : 'incomplete';

        // Add completion animation
        if (status === 'completed') {
            taskCard.style.animation = 'completeTask 0.5s ease-out';
        }

        saveTasks();
        renderTasks();
        showNotification(`Task marked as ${status}`, 'success');
    } else if (e.target.classList.contains('delete-btn')) {
        if (confirm('Are you sure you want to delete this task?')) {
            // Add delete animation
            taskCard.style.animation = 'slideOut 0.3s ease-out';

            // Wait for the animation to finish before removing the task
            taskCard.addEventListener('animationend', () => {
                console.log('Animation ended, deleting task...'); // Debugging
                tasks[selectedDay].splice(taskIndex, 1);
                saveTasks();
                renderTasks();
                showNotification('Task deleted', 'success');
            }, { once: true }); // Use { once: true } to ensure the event listener is removed after firing
        }
    }
}

// Render tasks for selected day
function renderTasks() {
    const dayTasks = Array.isArray(tasks[selectedDay]) ? tasks[selectedDay] : [];
    dayTasks.sort((a, b) => {
        return new Date('1970/01/01 ' + a.time) - new Date('1970/01/01 ' + b.time);
    });

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);

    tasksContainer.innerHTML = dayTasks.map(task => {
        const priority = task.priority || 'medium';
        const priorityLabel = priority.charAt(0).toUpperCase() + priority.slice(1);

        // Check if task is urgent (starting in less than 15 minutes)
        const taskTime = new Date('1970/01/01 ' + task.time);
        const currentDateTime = new Date('1970/01/01 ' + currentTime);
        const isUrgent = !task.completed && 
                        taskTime > currentDateTime && 
                        taskTime - currentDateTime <= 900000; // 15 minutes

        // Check if task is in progress
        const taskEndTime = new Date(taskTime.getTime() + task.duration * 60000);
        const isInProgress = !task.completed && 
                           currentDateTime >= taskTime && 
                           currentDateTime <= taskEndTime;

        return `
            <div class="task-card ${task.completed ? 'completed' : ''} priority-${priority}" 
                 data-id="${task.id}"
                 data-urgent="${isUrgent}"
                 style="${isInProgress ? 'border-color: var(--primary-color); box-shadow: var(--highlight-glow);' : ''}">
                <div class="task-info">
                    <div class="task-title">
                        ${task.title}
                        ${isInProgress ? ' <span style="color: var(--primary-color);">(In Progress)</span>' : ''}
                        ${isUrgent ? ' <span style="color: var(--error-color);">(Starting Soon)</span>' : ''}
                    </div>
                    ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                    <div class="task-time">
                        <i>⏰</i> ${formatTime(task.time)} • ${task.duration} minutes
                    </div>
                    <div class="task-meta">
                        <span class="task-priority priority-${priority}-tag">
                            ${priorityLabel} Priority
                        </span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="task-btn complete-btn" title="${task.completed ? 'Mark as incomplete' : 'Mark as complete'}">
                        ✓
                    </button>
                    <button class="task-btn delete-btn" title="Delete task">
                        ×
                    </button>
                </div>
            </div>
        `;
    }).join('') || '<p class="no-tasks">No tasks scheduled for this day. Click the "+" button to add one!</p>';
}

// Helper functions
function formatTime(time) {
    return new Date('1970/01/01 ' + time).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function resetForm() {
    document.getElementById('task-title').value = '';
    document.getElementById('task-time').value = '';
    document.getElementById('task-duration').value = '30';
    document.getElementById('task-description').value = '';
    document.getElementById('task-priority').value = 'medium';
}

function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function showNotification(message, type = 'success') {
    const existingNotification = document.querySelector('.notification:not(.hidden)');
    if (existingNotification) {
        existingNotification.remove();
    }

    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');

    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

// Initialize the app
init();
