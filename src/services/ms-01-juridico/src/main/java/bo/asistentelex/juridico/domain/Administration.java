package bo.asistentelex.juridico.domain;

import java.util.List;

public final class Administration {
	private Administration() {}
	public record Lawyer(String id, String name, String email, boolean enabled) {}
	public record PageInfo(String endCursor, boolean hasNextPage) {}
	public record Page<T>(List<T> items, PageInfo pageInfo) {}
	public record Settings(String globalMessage, String supportEmail) {}
	public record ParameterChange(String key, String previousValue, String newValue, Settings settings) {}
	public record Event(String id, String type, String date, String userId, String result,
			String operation, String targetId, String parameter, String previousValue, String newValue, String agentId) {}
	public record Filter(String type, String from, String until, String userId) {}
	public record Change(boolean applied, boolean auditRecorded, String category, String message, Lawyer account, Settings settings) {}
	public static final class Failure extends RuntimeException {
		private final String category;
		public Failure(String category, String message) { super(message); this.category = category; }
		public String category() { return category; }
	}
}