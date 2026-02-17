import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Lang = 'fr' | 'en';

const translations = {
  fr: {
    appName: 'Coupure Alert',
    subtitle: 'Cameroun',
    home: 'Accueil',
    report: 'Signaler',
    map: 'Carte',
    history: 'Historique',
    stats: 'Stats',
    reportOutage: 'Signaler une coupure',
    water: 'Eau',
    electricity: 'Électricité',
    internet: 'Internet',
    selectType: 'Type de coupure',
    location: 'Localisation',
    detecting: 'Détection en cours...',
    addPhoto: 'Photo (optionnel)',
    takePhoto: 'Caméra',
    chooseGallery: 'Galerie',
    submit: 'Envoyer',
    cancel: 'Annuler',
    success: 'Signalement envoyé !',
    reportSaved: 'Votre coupure a été enregistrée.',
    reportSavedOffline: 'Sauvegardé localement.',
    confirm: 'Confirmer cette coupure',
    confirmations: 'confirmations',
    confirmation: 'confirmation',
    confirmed: 'Confirmé !',
    alreadyConfirmed: 'Déjà confirmé aujourd\'hui',
    nearbyOutages: 'Coupures à proximité',
    noNearbyOutages: 'Aucune coupure récente à proximité',
    recentOutages: 'Coupures récentes',
    allRegions: 'Toutes',
    allVilles: 'Toutes les villes',
    allTypes: 'Tout',
    noOutages: 'Aucune coupure signalée',
    noOutagesYet: 'Rien à signaler pour le moment',
    outagesByType: 'Répartition par type',
    outagesByRegion: 'Coupures par région',
    period: 'Période',
    week: 'Semaine',
    month: 'Mois',
    all: 'Tout',
    total: 'Total',
    share: 'Partager',
    shareText: '⚠️ Coupure signalée',
    locationPermission: 'Localisation requise',
    locationPermissionMsg: 'Autorisez l\'accès à la position pour signaler une coupure.',
    grantPermission: 'Autoriser',
    openSettings: 'Paramètres',
    cameraPermission: 'Permission caméra nécessaire',
    neighborhood: 'Quartier',
    city: 'Ville',
    region: 'Région',
    date: 'Date',
    details: 'Détails',
    language: 'Langue',
    french: 'Français',
    english: 'English',
    settings: 'Paramètres',
    restored: 'Rétabli',
    markRestored: 'Marquer comme rétabli',
    activeOutages: 'actives',
    active: 'Actives',
    today: 'Aujourd\'hui',
    yesterday: 'Hier',
    ago: 'il y a',
    hours: 'h',
    minutes: 'min',
    justNow: 'À l\'instant',
    seeAll: 'Voir tout',
    quickReport: 'Signaler vite',
    dashboard: 'Tableau de bord',
    appwriteSettings: 'Configuration Appwrite',
    endpoint: 'Endpoint URL',
    projectId: 'Project ID',
    databaseId: 'Database ID',
    collectionId: 'Collection ID',
    bucketId: 'Bucket ID',
    save: 'Enregistrer',
    connected: 'Connecté',
    notConnected: 'Non connecté',
    sync: 'Synchroniser',
    syncing: 'Synchronisation...',
    synced: 'Synchronisé',
    syncSuccess: 'Synchronisation réussie',
    configure: 'Configurer',
    outagesCount: 'coupures',
    people: 'personnes',
    authTitle: 'Bienvenue',
    authSubtitle: 'Connectez-vous pour sauvegarder vos signalements',
    phoneNumber: 'Numéro de téléphone',
    password: 'Mot de passe',
    login: 'Se connecter',
    createAccount: 'Créer un compte',
    noAccount: 'Pas de compte ?',
    hasAccount: 'Déjà un compte ?',
    displayName: 'Nom (optionnel)',
    phoneHint: 'Ex: 6XXXXXXXX',
    passwordHint: 'Minimum 8 caractères',
    registering: 'Inscription...',
    loggingIn: 'Connexion...',
    logout: 'Déconnexion',
    myAccount: 'Mon compte',
    myReports: 'Mes signalements',
    admin: 'Administration',
    adminPanel: 'Panneau admin',
    manageUsers: 'Utilisateurs',
    manageOutages: 'Coupures',
    totalUsers: 'utilisateurs',
    deleteUser: 'Supprimer',
    confirmDelete: 'Confirmer la suppression ?',
    confirmDeleteUser: 'Voulez-vous vraiment supprimer cet utilisateur ?',
    confirmDeleteOutage: 'Voulez-vous vraiment supprimer cette coupure ?',
    makeAdmin: 'Nommer admin',
    removeAdmin: 'Retirer admin',
    adminBadge: 'Admin',
    userBadge: 'Utilisateur',
    noUsers: 'Aucun utilisateur',
    regions: {
      adamaoua: 'Adamaoua',
      centre: 'Centre',
      est: 'Est',
      extremeNord: 'Extrême-Nord',
      littoral: 'Littoral',
      nord: 'Nord',
      nordOuest: 'Nord-Ouest',
      ouest: 'Ouest',
      sud: 'Sud',
      sudOuest: 'Sud-Ouest',
    },
  },
  en: {
    appName: 'Coupure Alert',
    subtitle: 'Cameroon',
    home: 'Home',
    report: 'Report',
    map: 'Map',
    history: 'History',
    stats: 'Stats',
    reportOutage: 'Report an outage',
    water: 'Water',
    electricity: 'Electricity',
    internet: 'Internet',
    selectType: 'Outage type',
    location: 'Location',
    detecting: 'Detecting location...',
    addPhoto: 'Photo (optional)',
    takePhoto: 'Camera',
    chooseGallery: 'Gallery',
    submit: 'Submit',
    cancel: 'Cancel',
    success: 'Report submitted!',
    reportSaved: 'Your outage has been recorded.',
    reportSavedOffline: 'Saved locally.',
    confirm: 'Confirm this outage',
    confirmations: 'confirmations',
    confirmation: 'confirmation',
    confirmed: 'Confirmed!',
    alreadyConfirmed: 'Already confirmed today',
    nearbyOutages: 'Nearby outages',
    noNearbyOutages: 'No recent outages nearby',
    recentOutages: 'Recent outages',
    allRegions: 'All',
    allVilles: 'All cities',
    allTypes: 'All',
    noOutages: 'No outages reported',
    noOutagesYet: 'Nothing to report yet',
    outagesByType: 'By type',
    outagesByRegion: 'By region',
    period: 'Period',
    week: 'Week',
    month: 'Month',
    all: 'All',
    total: 'Total',
    share: 'Share',
    shareText: 'Outage reported',
    locationPermission: 'Location required',
    locationPermissionMsg: 'Allow location access to report an outage.',
    grantPermission: 'Allow',
    openSettings: 'Settings',
    cameraPermission: 'Camera permission required',
    neighborhood: 'Neighborhood',
    city: 'City',
    region: 'Region',
    date: 'Date',
    details: 'Details',
    language: 'Language',
    french: 'Français',
    english: 'English',
    settings: 'Settings',
    restored: 'Restored',
    markRestored: 'Mark as restored',
    activeOutages: 'active',
    active: 'Active',
    today: 'Today',
    yesterday: 'Yesterday',
    ago: 'ago',
    hours: 'h',
    minutes: 'min',
    justNow: 'Just now',
    seeAll: 'See all',
    quickReport: 'Quick report',
    dashboard: 'Dashboard',
    appwriteSettings: 'Appwrite Setup',
    endpoint: 'Endpoint URL',
    projectId: 'Project ID',
    databaseId: 'Database ID',
    collectionId: 'Collection ID',
    bucketId: 'Bucket ID',
    save: 'Save',
    connected: 'Connected',
    notConnected: 'Not connected',
    sync: 'Sync',
    syncing: 'Syncing...',
    synced: 'Synced',
    syncSuccess: 'Sync successful',
    configure: 'Configure',
    outagesCount: 'outages',
    people: 'people',
    authTitle: 'Welcome',
    authSubtitle: 'Sign in to save your reports',
    phoneNumber: 'Phone number',
    password: 'Password',
    login: 'Sign in',
    createAccount: 'Create account',
    noAccount: 'No account?',
    hasAccount: 'Already have an account?',
    displayName: 'Name (optional)',
    phoneHint: 'Ex: 6XXXXXXXX',
    passwordHint: 'Minimum 8 characters',
    registering: 'Creating account...',
    loggingIn: 'Signing in...',
    logout: 'Sign out',
    myAccount: 'My account',
    myReports: 'My reports',
    admin: 'Administration',
    adminPanel: 'Admin panel',
    manageUsers: 'Users',
    manageOutages: 'Outages',
    totalUsers: 'users',
    deleteUser: 'Delete',
    confirmDelete: 'Confirm deletion?',
    confirmDeleteUser: 'Are you sure you want to delete this user?',
    confirmDeleteOutage: 'Are you sure you want to delete this outage?',
    makeAdmin: 'Make admin',
    removeAdmin: 'Remove admin',
    adminBadge: 'Admin',
    userBadge: 'User',
    noUsers: 'No users',
    regions: {
      adamaoua: 'Adamaoua',
      centre: 'Centre',
      est: 'East',
      extremeNord: 'Far North',
      littoral: 'Littoral',
      nord: 'North',
      nordOuest: 'North-West',
      ouest: 'West',
      sud: 'South',
      sudOuest: 'South-West',
    },
  },
};

function getDeviceLanguage(): Lang {
  try {
    let locale = 'fr';
    if (Platform.OS === 'ios') {
      locale = NativeModules.SettingsManager?.settings?.AppleLocale ||
               NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] || 'fr';
    } else if (Platform.OS === 'android') {
      locale = NativeModules.I18nManager?.localeIdentifier || 'fr';
    } else {
      locale = typeof navigator !== 'undefined' ? navigator.language : 'fr';
    }
    return locale.startsWith('en') ? 'en' : 'fr';
  } catch {
    return 'fr';
  }
}

interface I18nContextValue {
  lang: Lang;
  t: typeof translations.fr;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getDeviceLanguage());

  const setLang = async (l: Lang) => {
    setLangState(l);
    await AsyncStorage.setItem('app_language', l);
  };

  const toggleLang = () => {
    setLang(lang === 'fr' ? 'en' : 'fr');
  };

  React.useEffect(() => {
    AsyncStorage.getItem('app_language').then((stored) => {
      if (stored === 'fr' || stored === 'en') {
        setLangState(stored);
      }
    });
  }, []);

  const value = useMemo(() => ({
    lang,
    t: translations[lang],
    setLang,
    toggleLang,
  }), [lang]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
