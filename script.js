'use strict';

// --- 1. DOM Element Caching ---
const taskForm = document.getElementById('task-form');
const taskTitleInput = document.getElementById('task-title');
const taskDescriptionInput = document.getElementById('task-description');
const taskDeadlineInput = document.getElementById('task-deadline');
const tasksList = document.getElementById('tasks-list');
const searchInput = document.getElementById('search-input');
const filterButtons = document.querySelector('.filter-controls__buttons');
const taskSubmitButton = document.getElementById('task-submit-btn'); // Cache the submit button

const statsTotal = document.getElementById('stats-total');
const statsPending = document.getElementById('stats-pending');
const statsCompleted = document.getElementById('stats-completed');

// --- 2. Application State ---
let tasks = [];
let currentFilter = 'all';
let searchTerm = '';
let editingTaskId = null; // NEW: To track the ID of the task being edited

// --- 3. API Service ---
const API_BASE = '/api/tasks';

// NEW: Centralized response checker
async function checkAuth(res) {
    if (!res.ok) {
        if (res.status === 401) {
            // Unauthorized, token is bad or expired
            alert('Your session has expired. Please log in again.');
            window.location.href = '/login.html';
        }
        throw new Error(`API Error: ${res.statusText}`);
    }
    return res;
}

const apiService = {
    fetchTasks: async () => {
        const res = await fetch(API_BASE);
        await checkAuth(res); // Check response
        return await res.json();
    },
    createTask: async (taskData) => {
        const res = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        await checkAuth(res); // Check response
        return await res.json();
    },
    updateTask: async (taskId, updateData) => {
        const res = await fetch(API_BASE, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        await checkAuth(res); // Check response
        return await res.json();
    },
    deleteTask: async (taskId) => {
        const task = tasks.find(t => t._id === taskId);
        if (!task || !task._rev) throw new Error('Missing _rev for delete');

        const res = await fetch(API_BASE, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ _id: task._id, _rev: task._rev })
        });
        await checkAuth(res); // Check response
        return await res.json();
    },
};

// --- 4. Rendering Logic ---
function renderTasks() {
    // ... (This function remains the same)
    tasksList.innerHTML = '';

    const filteredTasks = tasks.filter(task => {
        const matchesFilter =
            (currentFilter === 'all') ||
            (currentFilter === 'pending' && !task.completed) ||
            (currentFilter === 'completed' && task.completed);

        const matchesSearch =
            (task.title?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
            (task.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false);

        return matchesFilter && matchesSearch;
    });

    if (filteredTasks.length === 0) {
        tasksList.innerHTML = '<p class="no-tasks-message">No tasks found. Try adjusting your filters or add a new task!</p>';
    } else {
        filteredTasks.forEach(task => {
            const taskElement = document.createElement('li');
            taskElement.className = `task-item ${task.completed ? 'task-item--completed' : ''}`;
            taskElement.dataset.taskId = task._id;
            taskElement.dataset.taskRev = task._rev;

            const deadline = new Date(task.deadline);
            const formattedDeadline = deadline.toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'
            });

            taskElement.innerHTML = `
                <input type="checkbox" class="task-item__checkbox" id="task-${task._id}" ${task.completed ? 'checked' : ''}>
                <div class="task-item__content">
                    <h3 class="task-item__title">${task.title}</h3>
                    <p class="task-item__description">${task.description}</p>
                    <div class="task-item__meta">
                        <svg class="task-item__icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        <span>Due: ${formattedDeadline}</span>
                    </div>
                </div>
                <div class="task-item__actions">
                    <button class="task-item__btn" data-action="edit" aria-label="Edit task" title="Edit Task"><svg class="task-item__btn-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></button>
                    <button class="task-item__btn task-item__btn--delete" data-action="delete" aria-label="Delete task" title="Delete Task"><svg class="task-item__btn-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                </div>
            `;
            tasksList.appendChild(taskElement);
        });
    }
    updateStats();
}

function updateStats() {
    // ... (This function remains the same)
    const totalCount = tasks.length;
    const completedCount = tasks.filter(task => task.completed).length;
    const pendingCount = totalCount - completedCount;

    statsTotal.textContent = totalCount;
    statsPending.textContent = pendingCount;
    statsCompleted.textContent = completedCount;
}

// --- 5. Event Handlers ---

// RENAMED: from handleAddTask to handleFormSubmit
async function handleFormSubmit(e) {
    e.preventDefault();
    const title = taskTitleInput.value.trim();
    const description = taskDescriptionInput.value.trim();
    const deadline = taskDeadlineInput.value;

    if (!title || !deadline) {
        alert('Please provide a title and a deadline.');
        return;
    }

    // NEW: Check if we are in edit mode
    if (editingTaskId) {
        // --- UPDATE LOGIC ---
        try {
            const taskToUpdate = tasks.find(t => t._id === editingTaskId);
            const updatedTaskPayload = {
                ...taskToUpdate, // Includes _id and _rev
                title,
                description,
                deadline
            };

            const response = await apiService.updateTask(editingTaskId, updatedTaskPayload);

            // Update the task in the local array
            const taskIndex = tasks.findIndex(t => t._id === editingTaskId);
            if (taskIndex !== -1) {
                tasks[taskIndex] = { ...updatedTaskPayload, _rev: response.rev };
            }

            // Reset editing state
            editingTaskId = null;
            taskSubmitButton.innerHTML = `<i class="fas fa-plus"></i> Add Task`;

            renderTasks();
        } catch (error) {
            console.error('Failed to update task:', error);
            alert('Error: Could not update the task.');
        }
    } else {
        // --- CREATE LOGIC (existing logic) ---
        const taskCreatedAt = new Date().toISOString();
        const createdTask = { title, description, deadline, createdAt: taskCreatedAt, completed: false };
        try {
            const response = await apiService.createTask(createdTask);
            const newTask = { ...createdTask, _id: response.id, _rev: response.rev };
            tasks.push(newTask);
            renderTasks();
        } catch (error) {
            console.error('Failed to create task:', error);
            alert('Error: Could not create the task.');
        }
    }
    taskForm.reset();
    taskTitleInput.focus();
}

async function handleTaskListClick(e) {
    const target = e.target;
    const taskItem = target.closest('.task-item');
    if (!taskItem) return;

    const taskId = taskItem.dataset.taskId;
    const actionButton = target.closest('.task-item__btn');

    if (target.matches('.task-item__checkbox')) {
        // ... (This logic remains the same)
        const isCompleted = target.checked;
        try {
            const taskToUpdate = tasks.find(t => t._id === taskId);
            const updatedTaskPayload = { ...taskToUpdate, completed: isCompleted };
            const updateResponse = await apiService.updateTask(taskId, updatedTaskPayload);
            taskToUpdate.completed = isCompleted;
            taskToUpdate._rev = updateResponse.rev;
            renderTasks();
        } catch (error) {
            console.error('Failed to update task status:', error);
            alert('Error: Could not update task status.');
            target.checked = !isCompleted;
        }
    }

    if (actionButton) {
        const action = actionButton.dataset.action;
        if (action === 'delete') {
            
            // --- MODIFIED DELETE LOGIC ---
            if (confirm('Are you sure you want to delete this task?')) {
                
                // 1. Add the fade-out class to the task item
                taskItem.classList.add('task-item--fading-out');

                // 2. Wait for the animation to finish (300ms)
                setTimeout(async () => {
                    try {
                        // 3. Run the API delete and local array update
                        await apiService.deleteTask(taskId);
                        tasks = tasks.filter(t => t._id !== taskId);
                        renderTasks(); // Re-render the list *after* the item is gone
                    } catch (error) {
                        console.error('Failed to delete task:', error);
                        alert('Error: Could not delete the task.');
                        // If it fails, remove the class so the item reappears
                        taskItem.classList.remove('task-item--fading-out');
                    }
                }, 300); // This duration must match your fadeOut animation
            }
            // --- END OF MODIFIED LOGIC ---

        } else if (action === 'edit') {
            // --- EDIT LOGIC (remains the same) ---
            const taskToEdit = tasks.find(t => t._id === taskId);
            if (!taskToEdit) return;

            // Set the state to indicate we are in edit mode
            editingTaskId = taskId;

            // Populate the form with the task's data
            taskTitleInput.value = taskToEdit.title;
            taskDescriptionInput.value = taskToEdit.description;
            taskDeadlineInput.value = taskToEdit.deadline;

            // Update the form button to show "Update Task"
            taskSubmitButton.innerHTML = `<i class="fas fa-save"></i> Update Task`;

            // Focus the first input for better UX
            taskTitleInput.focus();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
}

function handleFilterClick(e) {
    // ... (This function remains the same)
    const target = e.target.closest('.filter-btn');
    if (!target) return;
    filterButtons.querySelector('.filter-btn--active').classList.remove('filter-btn--active');
    target.classList.add('filter-btn--active');
    currentFilter = target.dataset.filter;
    renderTasks();
}

function handleSearch(e) {
    // ... (This function remains the same)
    searchTerm = e.target.value;
    renderTasks();
}

// --- 6. Initialization ---
async function initializeApp() {
    // UPDATED: Changed handleAddTask to handleFormSubmit
    taskForm.addEventListener('submit', handleFormSubmit);
    tasksList.addEventListener('click', handleTaskListClick);
    filterButtons.addEventListener('click', handleFilterClick);
    searchInput.addEventListener('input', handleSearch);

    try {
        tasks = await apiService.fetchTasks();
        renderTasks();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        tasksList.innerHTML = '<p class="error-message">Could not load tasks. Please try again later.</p>';
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);
