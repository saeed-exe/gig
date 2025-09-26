import * as React from 'react';
import { db } from '../../firebase';
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    orderBy,
    Timestamp,
    serverTimestamp
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { LayoutAnimation, Platform, UIManager } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type Task = {
    id: string;
    title: string;
    description: string;
    dueDate: string;
    priority: 'low' | 'medium' | 'high';
    completed: boolean;
    userId: string;
    createdAt?: string;
};

type State = {
    tasks: Task[];
    loading: boolean;
    filterPriority: 'all' | 'low' | 'medium' | 'high';
    filterStatus: 'all' | 'completed' | 'incomplete';
};

type Action =
    | { type: 'SET_TASKS'; payload: Task[] }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_FILTER_PRIORITY'; payload: State['filterPriority'] }
    | { type: 'SET_FILTER_STATUS'; payload: State['filterStatus'] }
    | { type: 'ADD_LOCAL'; payload: Task }
    | { type: 'UPDATE_LOCAL'; payload: { id: string; partial: Partial<Task> } }
    | { type: 'REMOVE_LOCAL'; payload: string }
    | { type: 'REPLACE_LOCAL_ID'; payload: { tempId: string; newId: string } };

function orderTasks(arr: Task[]) {
    return arr.sort((a, b) => {
        const ta = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const tb = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        if (ta !== tb) return ta - tb;
        const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return ca - cb;
    });
}

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case 'SET_TASKS':
            return { ...state, tasks: orderTasks(action.payload), loading: false };
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        case 'SET_FILTER_PRIORITY':
            return { ...state, filterPriority: action.payload };
        case 'SET_FILTER_STATUS':
            return { ...state, filterStatus: action.payload };
        case 'ADD_LOCAL': {
            const next = orderTasks([...state.tasks, action.payload]);
            return { ...state, tasks: next };
        }
        case 'UPDATE_LOCAL': {
            const next = state.tasks.map(t => (t.id === action.payload.id ? { ...t, ...action.payload.partial } : t));
            return { ...state, tasks: orderTasks(next) };
        }
        case 'REMOVE_LOCAL': {
            const next = state.tasks.filter(t => t.id !== action.payload);
            return { ...state, tasks: next };
        }
        case 'REPLACE_LOCAL_ID': {
            const next = state.tasks.map(t => (t.id === action.payload.tempId ? { ...t, id: action.payload.newId } : t));
            return { ...state, tasks: next };
        }
        default:
            return state;
    }
}

const initial: State = {
    tasks: [],
    loading: true,
    filterPriority: 'all',
    filterStatus: 'all'
};

type TaskContextType = {
    state: State;
    createTask: (payload: { title: string; description: string; dueDate: string; priority: Task['priority'] }) => Promise<void>;
    updateTask: (id: string, partial: Partial<Omit<Task, 'id' | 'userId'>>) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;
    setFilterPriority: (p: State['filterPriority']) => void;
    setFilterStatus: (s: State['filterStatus']) => void;
};

const TaskContext = React.createContext<TaskContextType | undefined>(undefined);

export function useTasks() {
    const ctx = React.useContext(TaskContext);
    if (!ctx) throw new Error('useTasks must be used inside TaskProvider');
    return ctx;
}

export function TaskProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = React.useReducer(reducer, initial);
    const { user } = useAuth();
    const unsubRef = React.useRef<(() => void) | null>(null);

    React.useEffect(() => {
        async function loadCache() {
            try {
                const raw = await AsyncStorage.getItem('tasks_cache_v2');
                if (raw) {
                    const parsed: Task[] = JSON.parse(raw);
                    dispatch({ type: 'SET_TASKS', payload: parsed });
                }
            } catch { }
        }
        loadCache();
    }, []);

    React.useEffect(() => {
        if (unsubRef.current) {
            unsubRef.current();
            unsubRef.current = null;
        }
        if (!user) {
            dispatch({ type: 'SET_TASKS', payload: [] });
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
        }
        dispatch({ type: 'SET_LOADING', payload: true });
        const q = query(
            collection(db, 'tasks'),
            where('userId', '==', user.uid),
            orderBy('dueDate', 'asc'),
            orderBy('createdAt', 'asc')
        );
        const unsub = onSnapshot(
            q,
            snap => {
                const arr: Task[] = snap.docs.map(d => {
                    const dd = d.data() as any;
                    let due = '';
                    if (dd?.dueDate && typeof dd.dueDate?.toDate === 'function') {
                        due = dd.dueDate.toDate().toISOString().split('T')[0];
                    } else if (typeof dd?.dueDate === 'string') {
                        due = dd.dueDate;
                    }
                    let created = '';
                    if (dd?.createdAt && typeof dd.createdAt?.toDate === 'function') {
                        created = dd.createdAt.toDate().toISOString();
                    }
                    return {
                        id: d.id,
                        title: dd?.title ?? '',
                        description: dd?.description ?? '',
                        dueDate: due,
                        priority: dd?.priority ?? 'medium',
                        completed: !!dd?.completed,
                        userId: dd?.userId ?? '',
                        createdAt: created
                    } as Task;
                });
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                dispatch({ type: 'SET_TASKS', payload: arr });
                AsyncStorage.setItem('tasks_cache_v2', JSON.stringify(arr)).catch(() => { });
            },
            err => {
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        );
        unsubRef.current = unsub;
        return () => {
            if (unsubRef.current) {
                unsubRef.current();
                unsubRef.current = null;
            }
        };
    }, [user]);

    async function createTask(payload: { title: string; description: string; dueDate: string; priority: Task['priority'] }) {
        if (!user) throw new Error('Not authenticated');
        const tempId = `local-${Date.now()}`;
        const local: Task = {
            id: tempId,
            title: payload.title,
            description: payload.description,
            dueDate: payload.dueDate,
            priority: payload.priority,
            completed: false,
            userId: user.uid,
            createdAt: new Date().toISOString()
        };
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        dispatch({ type: 'ADD_LOCAL', payload: local });
        try {
            const dt = new Date(payload.dueDate);
            const dueTs = isNaN(dt.getTime()) ? Timestamp.fromDate(new Date()) : Timestamp.fromDate(dt);
            const ref = await addDoc(collection(db, 'tasks'), {
                title: payload.title,
                description: payload.description,
                dueDate: dueTs,
                priority: payload.priority,
                completed: false,
                userId: user.uid,
                createdAt: serverTimestamp()
            });
            dispatch({ type: 'REPLACE_LOCAL_ID', payload: { tempId, newId: ref.id } });
        } catch (e) {
            dispatch({ type: 'REMOVE_LOCAL', payload: tempId });
            throw e;
        }
    }

    async function updateTask(id: string, partial: Partial<Omit<Task, 'id' | 'userId'>>) {
        const prev = state.tasks.find(t => t.id === id);
        if (!prev) throw new Error('Task not found');
        const prevCopy = { ...prev };
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        dispatch({ type: 'UPDATE_LOCAL', payload: { id, partial: partial as Partial<Task> } });
        try {
            if (id.startsWith('local-')) {
                // still syncing; we updated local copy and will rely on server snapshot once created
                return;
            }
            const ref = doc(db, 'tasks', id);
            const payload: any = { ...partial };
            if (partial.dueDate) {
                const dt = new Date(partial.dueDate);
                payload.dueDate = isNaN(dt.getTime()) ? Timestamp.fromDate(new Date()) : Timestamp.fromDate(dt);
            }
            await updateDoc(ref, payload);
        } catch (e) {
            // rollback
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            dispatch({ type: 'UPDATE_LOCAL', payload: { id, partial: prevCopy } });
            throw e;
        }
    }

    async function deleteTask(id: string) {
        const prev = state.tasks.find(t => t.id === id);
        if (!prev) return;
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        dispatch({ type: 'REMOVE_LOCAL', payload: id });
        try {
            if (id.startsWith('local-')) {
                // task not yet synced to server, local remove is enough
                return;
            }
            const ref = doc(db, 'tasks', id);
            await deleteDoc(ref);
        } catch (e) {
            // rollback
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            dispatch({ type: 'ADD_LOCAL', payload: prev });
            throw e;
        }
    }

    function setFilterPriority(p: State['filterPriority']) {
        dispatch({ type: 'SET_FILTER_PRIORITY', payload: p });
    }

    function setFilterStatus(s: State['filterStatus']) {
        dispatch({ type: 'SET_FILTER_STATUS', payload: s });
    }

    const value: TaskContextType = { state, createTask, updateTask, deleteTask, setFilterPriority, setFilterStatus };
    return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}
