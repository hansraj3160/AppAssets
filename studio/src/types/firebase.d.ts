declare module "firebase/app" {
  export interface FirebaseApp {
    name: string;
    options: Record<string, unknown>;
  }
  export function initializeApp(options: Record<string, unknown>, name?: string): FirebaseApp;
  export function getApp(name?: string): FirebaseApp;
  export function getApps(): FirebaseApp[];
}

declare module "firebase/auth" {
  export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  }
  export interface Auth {
    currentUser: User | null;
  }
  export class GoogleAuthProvider {
    constructor();
    addScope(scope: string): void;
    setCustomParameters(customOAuthParameters: Record<string, string>): void;
  }
  export function getAuth(app?: any): Auth;
  export function onAuthStateChanged(
    auth: Auth,
    next: (user: User | null) => void,
    error?: (error: Error) => void
  ): () => void;
  export function signInWithPopup(auth: Auth, provider: any): Promise<any>;
  export function signInWithEmailAndPassword(auth: Auth, email: string, pass: string): Promise<any>;
  export function createUserWithEmailAndPassword(auth: Auth, email: string, pass: string): Promise<any>;
  export function signOut(auth: Auth): Promise<void>;
  export function sendPasswordResetEmail(auth: Auth, email: string): Promise<void>;
}

declare module "firebase/firestore" {
  export interface Firestore {}
  export interface DocumentReference<T = any> {
    id: string;
    path: string;
  }
  export interface DocumentSnapshot<T = any> {
    exists(): boolean;
    data(): T | undefined;
    id: string;
  }
  export function getFirestore(app?: any): Firestore;
  export function doc(firestore: Firestore, path: string, ...pathSegments: string[]): DocumentReference;
  export function getDoc(reference: DocumentReference): Promise<DocumentSnapshot>;
  export function setDoc(reference: DocumentReference, data: any, options?: any): Promise<void>;
  export function updateDoc(reference: DocumentReference, data: any): Promise<void>;
  export function onSnapshot(
    reference: DocumentReference,
    observer: (snapshot: DocumentSnapshot) => void,
    onError?: (error: Error) => void
  ): () => void;
  export function increment(n: number): any;
}
