import {

  createContext,

  useCallback,

  useContext,

  useEffect,

  useMemo,

  useRef,

  useState,

} from "react";

import { fetchMyPermissions } from "../api/permissions";

import { decodeAuthToken, getCanonicalRole } from "../utils/auth";

import {

  applySchoolContextFromPermissions,

  clearActiveSchoolId,

  getActiveSchoolId,

  setActiveSchoolId,

} from "../utils/schoolContext";



const createUnauthenticatedState = () => ({

  loading: false,

  isAuthenticated: false,

  user: null,

  role: null,

  permissions: new Set(),

  administrativeCharges: [],

  overridesApplied: [],

  schools: [],

  activeSchoolId: null,

  schoolContextReady: true,

});



const buildUserFromToken = (tokenPayload = {}) => ({

  id: tokenPayload.id ?? null,

  school_id: tokenPayload.school_id ?? null,

  teacher_id: tokenPayload.teacher_id ?? null,

});



const createAuthenticatedLoadingState = (tokenPayload) => {

  const jwtSchoolId = tokenPayload.school_id ?? null;



  return {

    loading: true,

    isAuthenticated: true,

    user: buildUserFromToken(tokenPayload),

    role: null,

    permissions: new Set(),

    administrativeCharges: [],

    overridesApplied: [],

    schools: [],

    activeSchoolId: jwtSchoolId != null ? Number(jwtSchoolId) : getActiveSchoolId(),

    schoolContextReady: jwtSchoolId != null,

  };

};



const createInitialState = () => {

  const token = localStorage.getItem("token");



  if (!token) {

    return createUnauthenticatedState();

  }



  return createAuthenticatedLoadingState(decodeAuthToken());

};



const PermissionContext = createContext(null);



export function PermissionProvider({ children }) {

  const [state, setState] = useState(createInitialState);

  const fetchGenerationRef = useRef(0);



  const resolvePermissions = useCallback(async () => {

    const token = localStorage.getItem("token");



    if (!token) {

      setState(createUnauthenticatedState());

      return;

    }



    const tokenPayload = decodeAuthToken();

    const fetchGeneration = fetchGenerationRef.current + 1;

    fetchGenerationRef.current = fetchGeneration;



    setState((prev) => ({

      ...prev,

      loading: true,

      isAuthenticated: true,

      user: buildUserFromToken(tokenPayload),

    }));



    try {

      const response = await fetchMyPermissions();

      const data = response?.data?.data || {};



      if (fetchGenerationRef.current !== fetchGeneration) {

        return;

      }



      const jwtSchoolId = tokenPayload.school_id ?? null;

      let schools = [];

      let activeSchoolId = jwtSchoolId != null ? Number(jwtSchoolId) : null;

      let schoolContextReady = jwtSchoolId != null;



      if (data.schoolContext) {
        schools = data.schoolContext.schools || [];
        activeSchoolId = applySchoolContextFromPermissions(data.schoolContext);
        schoolContextReady = schools.length === 0 || activeSchoolId != null;
      }



      setState({

        loading: false,

        isAuthenticated: true,

        user: buildUserFromToken(tokenPayload),

        role: data.role || getCanonicalRole(),

        permissions: new Set(data.permissions || []),

        administrativeCharges: data.administrativeCharges || [],

        overridesApplied: data.overridesApplied || [],

        schools,

        activeSchoolId,

        schoolContextReady,

      });

    } catch {

      if (fetchGenerationRef.current !== fetchGeneration) {

        return;

      }



      setState({

        loading: false,

        isAuthenticated: true,

        user: buildUserFromToken(tokenPayload),

        role: getCanonicalRole(),

        permissions: new Set(),

        administrativeCharges: [],

        overridesApplied: [],

        schools: [],

        activeSchoolId: tokenPayload.school_id ?? getActiveSchoolId(),

        schoolContextReady: tokenPayload.school_id != null,

      });

    }

  }, []);



  const clearPermissions = useCallback(() => {

    fetchGenerationRef.current += 1;

    clearActiveSchoolId();

    setState(createUnauthenticatedState());

  }, []);



  const selectActiveSchool = useCallback((schoolId) => {

    const parsedSchoolId = Number(schoolId);



    if (!Number.isInteger(parsedSchoolId) || parsedSchoolId <= 0) {

      return;

    }



    setActiveSchoolId(parsedSchoolId);

    setState((prev) => ({

      ...prev,

      activeSchoolId: parsedSchoolId,

      schoolContextReady: true,

    }));

  }, []);



  const reloadPermissions = useCallback(async () => {

    await resolvePermissions();

  }, [resolvePermissions]);



  useEffect(() => {

    const token = localStorage.getItem("token");



    if (!token) {

      return;

    }



    resolvePermissions();

  }, [resolvePermissions]);



  useEffect(() => {

    const handleStorage = (event) => {

      if (event.key !== "token") {

        return;

      }



      if (!event.newValue) {

        clearPermissions();

        return;

      }



      reloadPermissions();

    };



    window.addEventListener("storage", handleStorage);

    return () => window.removeEventListener("storage", handleStorage);

  }, [clearPermissions, reloadPermissions]);



  const value = useMemo(

    () => ({

      ...state,

      reloadPermissions,

      clearPermissions,

      selectActiveSchool,

    }),

    [state, reloadPermissions, clearPermissions, selectActiveSchool]

  );



  return (

    <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>

  );

}



export function usePermissionContext() {

  const context = useContext(PermissionContext);



  if (!context) {

    throw new Error("usePermissionContext must be used within PermissionProvider");

  }



  return context;

}



export default PermissionContext;


