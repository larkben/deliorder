import type { PageServerLoad } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";
import { loginAdmin } from "$lib/server/adminAuth";

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();
    
    return {
        session,
    };
};

export const actions: Actions = {
    adminLogin: async ({ request, cookies }) => {
        const data = await request.formData();
        const username = data.get("username")?.toString().trim() ?? "";
        const password = data.get("password")?.toString() ?? "";

        if (!username || !password) {
            return fail(400, { adminError: "Enter an admin username and password." });
        }

        const admin = await loginAdmin(username, password, cookies);

        if (!admin) {
            return fail(401, { adminError: "Invalid admin login." });
        }

        throw redirect(303, "/admin");
    },
};
