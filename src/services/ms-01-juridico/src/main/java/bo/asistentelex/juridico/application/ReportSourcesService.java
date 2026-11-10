package bo.asistentelex.juridico.application;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import bo.asistentelex.juridico.domain.Identity.User;
import bo.asistentelex.juridico.domain.CaseRecords.ActuationFilter;
import bo.asistentelex.juridico.domain.Cases.Failure;

public final class ReportSourcesService {
	private final CaseService cases;
	private final ParticipantService participants;
	private final CaseRecordService records;
	public ReportSourcesService(CaseService cases, ParticipantService participants, CaseRecordService records) { this.cases=cases; this.participants=participants; this.records=records; }
	public Map<String,Object> sources(User actor, String caseId, String audience, String type, String fromDate, String toDate) {
		if (!List.of("CLIENT","INTERNAL").contains(audience)) throw new Failure("VALIDATION","Audiencia de informe invalida.");
		var file=cases.get(actor,caseId);
		Map<String,Object> basic=new LinkedHashMap<>();basic.put("code",file.code());basic.put("title",file.title());basic.put("area",file.area());basic.put("state",file.state());
		if (audience.equals("INTERNAL") && file.description()!=null) basic.put("description",file.description());
		List<Map<String,Object>> people=new ArrayList<>(), acts=new ArrayList<>();String cursor=null;
		do { var page=participants.list(actor,caseId,100,cursor);for(var item:page.items())people.add(Map.of("name",item.person().displayName(),"role",item.role()));if(people.size()>1000)throw new Failure("VALIDATION","Demasiadas fuentes; no se omitieron participantes.");cursor=page.pageInfo().hasNextPage()?page.pageInfo().endCursor():null; } while(cursor!=null);
		cursor=null;
		do { var page=records.actuations(actor,caseId,new ActuationFilter(type,fromDate,toDate),100,cursor);for(var item:page.items())acts.add(Map.of("type",item.type(),"date",item.date(),"description",item.description()));if(acts.size()>1000)throw new Failure("VALIDATION","Demasiadas fuentes; no se omitieron actuaciones.");cursor=page.pageInfo().hasNextPage()?page.pageInfo().endCursor():null; } while(cursor!=null);
		return Map.of("caseId",file.id(),"caseData",basic,"participants",people,"actuations",acts);
	}
}