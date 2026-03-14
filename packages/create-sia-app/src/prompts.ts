import crypto from "node:crypto";
import * as p from "@clack/prompts";
import pc from "picocolors";

export type ScaffoldOptions = {
	projectName: string;
	appKey: string;
	indexerUrl: string;
	appDescription: string;
};

export async function runPrompts(): Promise<ScaffoldOptions | null> {
	p.intro(pc.green("Create Sia App"));

	const projectName = await p.text({
		message: "What is your project name?",
		placeholder: "my-sia-app",
		validate(value) {
			if (!value.trim()) return "Project name is required";
			if (!/^[a-z0-9._-]+$/i.test(value.trim()))
				return "Use only letters, numbers, dashes, dots, and underscores";
		},
	});

	if (p.isCancel(projectName)) {
		p.cancel("Cancelled.");
		return null;
	}

	const keyChoice = await p.select({
		message: "App key setup",
		options: [
			{
				value: "generate",
				label: "Generate a new app key",
				hint: "Recommended",
			},
			{ value: "existing", label: "Enter an existing app key" },
		],
	});

	if (p.isCancel(keyChoice)) {
		p.cancel("Cancelled.");
		return null;
	}

	let appKey: string;

	if (keyChoice === "existing") {
		const existingKey = await p.text({
			message: "Enter your app key (64-char hex)",
			validate(value) {
				if (!/^[a-f0-9]{64}$/i.test(value.trim()))
					return "App key must be a 64-character hex string";
			},
		});

		if (p.isCancel(existingKey)) {
			p.cancel("Cancelled.");
			return null;
		}

		appKey = existingKey.trim();
	} else {
		appKey = crypto.randomBytes(32).toString("hex");
		p.log.info(`Generated app key: ${pc.cyan(appKey)}`);
	}

	const indexerUrl = await p.text({
		message: "Indexer URL",
		initialValue: "https://sia.storage",
	});

	if (p.isCancel(indexerUrl)) {
		p.cancel("Cancelled.");
		return null;
	}

	const appDescription = await p.text({
		message: "App description (optional)",
		placeholder: "My decentralized storage app",
		defaultValue: "A Sia storage app",
	});

	if (p.isCancel(appDescription)) {
		p.cancel("Cancelled.");
		return null;
	}

	return {
		projectName: projectName.trim(),
		appKey,
		indexerUrl: indexerUrl.trim(),
		appDescription: appDescription.trim() || "A Sia storage app",
	};
}
